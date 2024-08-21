import {
  CardElement,
  LinkAuthenticationElement,
} from '@stripe/react-stripe-js'
import {useEffect, useState} from 'react'
import {useStripe, useElements} from '@stripe/react-stripe-js';

export default function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);


  

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe) {
      // Stripe.js has not yet loaded.
      // Make sure to disable form submission until Stripe.js has loaded.
      return;
    }
    setIsLoading(true);

    const { paymentMethod, error } = await stripe.createPaymentMethod({
      type: 'card',
      card: elements.getElement(CardElement),
    });
    const response = await fetch('/api/create-customer-payment-method', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: e.target.email.value, paymentMethod }),
    });
    
    let customerPaymentMethod
    if(response.status === 201){
     customerPaymentMethod = await response.json();
     window.location.reload(true)
    }else{
      const error = await response.json();
      setMessage(error.error.message)
      setIsLoading(false)
      return
    }
    if (error) {
      setMessage(error.message);
    } 
    setIsLoading(false);


  }
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    const response = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: e.target.email.value  }),
    });
    
    let paymentIntent
    if(response.status === 200){
     paymentIntent = await response.json();
    }else{
      const error = await response.json();
      setIsLoading(false)
      return
    }
    setIsLoading(false);
    setTimeout(() => {
      window.location.reload()
    }, 3000);
  }
  
  return (
    <>
    <form style={{ maxWidth: "500px" }} id="payment-form" onSubmit={handleSubmit}>
      {/* <LinkAuthenticationElement id="link-authentication-element"
        /> */}
      <label htmlFor="email">Email address</label>
      <input type="email" id="email"  required />
      <label htmlFor="card-element">Credit or debit card</label>
      <CardElement id="card-element" options={{
        showIcon: true
      }} />
      <button disabled={isLoading || !stripe || !elements} id="submit">
        <span id="button-text">
          {isLoading ? <div className="spinner" id="spinner"></div> : "Add now"}
        </span>
      </button>
      {/* Show any error or success messages */}
      {message && <div id="payment-message">{message}</div>}
    </form>
    <form id="payment-form" style={{ maxWidth: "500px" }} onSubmit={handlePaymentSubmit}>
      <label>Email Address</label>
      <input type="email" id="email" name="email"  required />
      <button type="submit">Payment Initiate now</button>
    </form>
    
   </>
  )
}


//accept payment checkout component

// import {
//   PaymentElement,
//   LinkAuthenticationElement
// } from '@stripe/react-stripe-js'
// import {useState} from 'react'
// import {useStripe, useElements} from '@stripe/react-stripe-js';

// export default function CheckoutForm() {
//   const stripe = useStripe();
//   const elements = useElements();
//   const [message, setMessage] = useState(null);
//   const [isLoading, setIsLoading] = useState(false);

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (!stripe || !elements) {
//       // Stripe.js has not yet loaded.
//       // Make sure to disable form submission until Stripe.js has loaded.
//       return;
//     }

//     setIsLoading(true);

//     const { error } = await stripe.confirmPayment({
//       elements,
//       confirmParams: {
//         // Make sure to change this to your payment completion page
//         return_url: `${window.location.origin}/completion`,
//       },
//     });

//     // This point will only be reached if there is an immediate error when
//     // confirming the payment. Otherwise, your customer will be redirected to
//     // your `return_url`. For some payment methods like iDEAL, your customer will
//     // be redirected to an intermediate site first to authorize the payment, then
//     // redirected to the `return_url`.
//     if (error.type === "card_error" || error.type === "validation_error") {
//       setMessage(error.message);
//     } else {
//       setMessage("An unexpected error occured.");
//     }

//     setIsLoading(false);
//   }

//   return (
//     <form id="payment-form" onSubmit={handleSubmit}>
//       <LinkAuthenticationElement id="link-authentication-element"
//         // Access the email value like so:
//         // onChange={(event) => {
//         //  setEmail(event.value.email);
//         // }}
//         //
//         // Prefill the email field like so:
//         // options={{defaultValues: {email: 'foo@bar.com'}}}
//         />
//       <PaymentElement id="payment-element" />
//       <button disabled={isLoading || !stripe || !elements} id="submit">
//         <span id="button-text">
//           {isLoading ? <div className="spinner" id="spinner"></div> : "Pay now"}
//         </span>
//       </button>
//       {/* Show any error or success messages */}
//       {message && <div id="payment-message">{message}</div>}
//     </form>
//   )
// }
