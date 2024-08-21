## Quick start

To run the application, you need to run 2 different processes: one for the backend and one for the frontend. For this you need to follow these steps:

1. Open your terminal - we'll assume you're using `bash`

2. First, we need to run the backend process. Go to the server folder and start it: npm i && npm run start

3. Second, we need to run the frontend process. Go to the client folder and start it: npm i && npm start

## For Running locally stripe

1. Install stripe cli

2. Open the terminal and run the following command: `stripe login; stripe listen --forward-to localhost:4242`

3. Keep the terminal open.


## Required Credentials

1. STRIPE_PUBLISHABLE_KEY - from the stripe dashboard->developers->api keys

2. STRIPE_SECRET_KEY - from the stripe dashboard->developers->api keys

3. STRIPE_WEBHOOK_SECRET - from the stripe dashboard->developers->webhooks

4. MONGODB URI - for connecting the mongodb.

## Dependencies

1. The dependencies for the backend are in the `server/package.json` file.

2. The dependencies for the frontend are in the `client/package.json` file.

## Server Endpoints

1. The stripe config endpoint is `/config` - it returns the publishable key

2. The payment intent endpoint is `/create-payment-intent` - it returns the payment intent

3. The customer and payment method endpoint is `/create-customer-payment-method` - it returns the created payment method

4. The webhook endpoint is `/webhook` - it returns the webhook event

5. The payment history endpoint is `/payment-history` - it returns the payment history

6. The download invoice endpoint is `/download-invoice/:invoiceId` - it returns the invoice pdf url

## Client Components

1. `index.jsx` - the root component

2. `App.jsx` - the app component, routes to other components, for initiate stripe configuration

3. `Payment.jsx` - initializing stripe elements and checkout form component attached to it. Payment history table for displaying payment history and download invoice link for downloading an invoice

4. `checkout-form.jsx` - the checkout form component for stripe card attach form and payment intent creation form

5. `comletion.jsx` - the payment completion component for displaying payment status. Currently not used for example completion page

