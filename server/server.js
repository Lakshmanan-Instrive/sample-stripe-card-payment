const express = require('express');
const app = express();
const {
  resolve,
  join
} = require('path');
// Replace if using a different env file or config
const env = require('dotenv').config({
  path: './.env'
});

const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('Failed to connect to MongoDB', err);
});


// Create a Mongoose schema for a payment method
const paymentMethodSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    index: true
  },
  paymentMethod: Object
}, {
  strict: false
});
const paymentHistorySchema = new mongoose.Schema({}, {
  strict: false
});


// Create a model for the payment method schema
const PaymentMethod = mongoose.model('PaymentMethod', paymentMethodSchema);

const PaymentHistory = mongoose.model('PaymentHistory', paymentHistorySchema);

const winston = require('winston');


// Configure winston
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/combined.log'
    }),
  ],
});

// Configure Stripe
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Serve static files from the React app
app.use(express.static(process.env.STATIC_DIR));
app.use(
  express.json({
    // We need the raw body to verify webhook signatures.
    // Let's compute it only when hitting the Stripe webhook endpoint.
    verify: function (req, res, buf) {
      if (req.originalUrl.startsWith('/webhook')) {
        req.rawBody = buf.toString();
      }
    },
  })
);

// Set up endpoint for sending a publishable key
app.get('/config', (req, res) => {
  res.send({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
});

// Set up endpoint for processing payments
app.post('/create-payment-intent', async (req, res) => {
  try {
    const paymentDetails = await PaymentMethod.findOne({
      email: req.body.email
    });
    if (!paymentDetails) {
      console.log("ABC");
      return res.status(400).send({
        error: {
          message: 'Payment method not found for this email',
        },
      });
    }
    let paymentIntent = await stripe.paymentIntents.create({
      currency: paymentDetails.paymentMethod.card.country === "GB" ? "eur" : "usd",
      amount: paymentDetails.paymentMethod.card.country === "GB" ? 10000 : 1000,
      automatic_payment_methods: {
        enabled: true
      },
      customer: paymentDetails.paymentMethod.customer,
      payment_method: paymentDetails.paymentMethod.id,
      confirm: true,
      off_session: true
    })

    res.send({
      paymentIntent
    });
  } catch (e) {
    return res.status(400).send({
      error: {
        message: e.message,
      },
    });
  }
});

// Set up endpoint for creating a customer and attaching a payment method
app.post('/create-customer-payment-method', async (req, res) => {
  try {
    const customer = await stripe.customers.create({
      email: req.body.email,
    });
    const paymentMethod = await stripe.paymentMethods.attach(
      req.body.paymentMethod.id, {
        customer: customer.id
      },
    );
    const createdPaymentMethod = await PaymentMethod.create({
      email: req.body.email,
      paymentMethod: paymentMethod
    })

    res.status(201).send({
      createdPaymentMethod
    });
  } catch (err) {
    return res.status(400).send({
      message: err.message,
      err
    });
  }

});

// Expose a endpoint as a webhook handler for asynchronous events.
app.post('/webhook', async (req, res) => {
  let data, eventType;

  // Check if webhook signing is configured.
  if (process.env.STRIPE_WEBHOOK_SECRET) {
    // Retrieve the event by verifying the signature using the raw body and secret.
    let event;
    let signature = req.headers['stripe-signature'];
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      logger.info(event)
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`);
      return res.sendStatus(400);
    }
    data = event.data;
    eventType = event.type;
  } else {
    // Webhook signing is recommended, but if the secret is not configured in `config.js`,
    // we can retrieve the event data directly from the request body.
    data = req.body.data;
    eventType = req.body.type;
  }

  const paymentIntent = data.object;
  if (eventType === 'payment_intent.succeeded') {

    let invoiceDetails = await generateInvoice(paymentIntent);
    await PaymentHistory.create({
      paymentIntent: paymentIntent,
      invoiceDetails: invoiceDetails
    })
    // Funds have been captured
    // Fulfill any orders, e-mail receipts, etc
    console.log('💰 Payment capturd!');
  } else if (eventType === 'payment_intent.payment_failed') {
    await PaymentHistory.create({
      paymentIntent: paymentIntent,
      invoiceDetails: null
    })
    console.log('❌ Payment failed.');
  }
  res.sendStatus(200);
});

// Set up endpoint for retrieving payment history
app.get('/payment-history', async (req, res) => {
  const paymentHistory = await PaymentHistory.find({}).sort({
    createdAt: -1
  })
  res.send(paymentHistory)
})
// Set up endpoint for downloading an invoice
app.get('/download-invoice/:invoiceId', async (req, res) => {
  const {
    invoiceId
  } = req.params;
  try {
    // Retrieve the invoice from Stripe
    const invoice = await stripe.invoices.retrieve(invoiceId);
    // Generate the invoice PDF URL
    const invoicePdfUrl = invoice.invoice_pdf;
    // Redirect the client to the PDF URL
    return res.status(200).json({
      url: invoicePdfUrl
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
});

app.listen(4242, () =>
  console.log(`Node server listening at http://localhost:4242`)
);

// Helper function to generate an invoice
const generateInvoice = async (paymentIntent) => {
  try {
    const customerId = paymentIntent.customer;
    // Create and finalize the invoice
    let invoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: 'send_invoice',
      days_until_due: 30,
      default_payment_method: paymentIntent.payment_method,
    });
    // Create the invoice item (charges linked to this invoice)
    await stripe.invoiceItems.create({
      customer: customerId,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      description: 'One-time payment charge',
      invoice: invoice.id
    });

    // Finalize the invoice
    invoice = await stripe.invoices.finalizeInvoice(invoice.id);

    // await stripe.invoices.pay(invoice.id);
    console.log(`Invoice ${invoice.id} created and finalized.`);

    return invoice;
  } catch (error) {
    console.error(`Error generating invoice: ${error.message}`);
  }
};


//for calculating tax
const calculate_tax = async (orderAmount, currency) => {
  const taxCalculation = await stripe.tax.calculations.create({
    currency,
    customer_details: {
      address: {
        line1: "10709 Cleary Blvd",
        city: "Plantation",
        state: "FL",
        postal_code: "33322",
        country: "US",
      },
      address_source: "shipping",
    },
    line_items: [{
      amount: orderAmount,
      reference: "ProductRef",
      tax_behavior: "exclusive",
      tax_code: "txcd_30011000"
    }],
  });

  return taxCalculation;
};

// For accepting payments flow
// app.get('/create-payment-intent', async (req, res) => {
//   // Create a PaymentIntent with the amount, currency, and a payment method type.
//   //
//   // See the documentation [0] for the full list of supported parameters.
//   //
//   // [0] https://stripe.com/docs/api/payment_intents/create
//   let orderAmount = 1400;
//   let paymentIntent;

//   try {
//     if (calculateTax) {
//       let taxCalculation = await calculate_tax(orderAmount, "usd")

//       paymentIntent = await stripe.paymentIntents.create({
//         currency: 'usd',
//         amount: taxCalculation.amount_total,
//         automatic_payment_methods: { enabled: true },
//         metadata: { tax_calculation: taxCalculation.id }
//       });
//     }
//     else {
//       paymentIntent = await stripe.paymentIntents.create({
//         currency: 'usd',
//         amount: orderAmount,
//         automatic_payment_methods: { enabled: true }
//       });
//     }

//     // Send publishable key and PaymentIntent details to client
//     res.send({
//       clientSecret: paymentIntent.client_secret,
//     });
//   } catch (e) {
//     return res.status(400).send({
//       error: {
//         message: e.message,
//       },
//     });
//   }
// });
