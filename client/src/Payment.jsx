import {useEffect, useState} from 'react';

import {Elements} from '@stripe/react-stripe-js';
import CheckoutForm from './CheckoutForm'

function Payment(props) {
  const { stripePromise } = props;

  const [paymentHistory, setPaymentHistory] = useState([]);

  useEffect(() => {
    const fetchPaymentHistory = async () => {
      const response = await fetch('/api/payment-history')
      const data = await response.json();
      setPaymentHistory(data);
    }
    fetchPaymentHistory();
  }, []);

  //Invoice Download Function
  const InvoiceDownloadButton = async(invoiceId) => {
        const response = await fetch(`/api/download-invoice/${invoiceId}`);
        const data = await response.json();
        window.location.href = data.url;
    }
  return (
    <>
      <table style={{borderCollapse: 'collapse', border: '1px solid black'}}>
        <thead style={{border: '1px solid black'}}>
          <tr>
            <th style={{border: '1px solid black', padding: '10px'}}>id</th>
            <th style={{border: '1px solid black', padding: '10px'}}>Amount</th>
            <th style={{border: '1px solid black', padding: '10px'}}>Payment Method</th>
            <th style={{border: '1px solid black', padding: '10px'}}>Currency</th>
            <th style={{border: '1px solid black', padding: '10px'}}>Status</th>
            <th style={{border: '1px solid black', padding: '10px'}}>Invoice</th>
          </tr>
        </thead>
        <tbody style={{padding: '10px'}}>
          {paymentHistory.map((item) => (
            <tr key={item.paymentIntent.id} style={{border: '1px solid black'}}>
              <td style={{border: '1px solid black', padding: '10px'}}>{item.paymentIntent.id}</td>
              <td style={{border: '1px solid black', padding: '10px'}}>{item.paymentIntent.amount}</td>
              <td style={{border: '1px solid black', padding: '10px'}}>{item.paymentIntent.payment_method}</td>
              <td style={{border: '1px solid black', padding: '10px'}}>{item.paymentIntent.currency}</td>
              <td style={{border: '1px solid black', padding: '10px'}}>{item.paymentIntent.status}</td>
              {
                item.invoiceDetails ? <td style={{border: '1px solid black', padding: '10px'}}>
                <td style={{cursor: 'pointer', textDecoration: 'underline', color: 'blue'}} onClick={() => InvoiceDownloadButton(item.invoiceDetails.id)}>link</td>
              </td> : <></>
              }
            </tr>
          ))}
        </tbody>
      </table>
      {stripePromise && (
      <><h1>Payment</h1>
      <Elements stripe={stripePromise}>
          <CheckoutForm />
        </Elements></>
      )}
      
    </>
  ); 
}

export default Payment;


//For generating client secret for accept a payment

// import {useEffect, useState} from 'react';

// import {Elements} from '@stripe/react-stripe-js';
// import CheckoutForm from './CheckoutForm'

// function Payment(props) {
//   const { stripePromise } = props;
//   const [ clientSecret, setClientSecret ] = useState('');

//   useEffect(() => {
//     // Create PaymentIntent as soon as the page loads
//     fetch("/api/create-payment-intent")
//       .then((res) => res.json())
//       .then(({clientSecret}) => setClientSecret(clientSecret));
//   }, []);


//   return (
//     <>
//       <h1>Payment</h1>
//       {clientSecret && stripePromise && (
//         <Elements stripe={stripePromise} options={{ clientSecret, }}>
//           <CheckoutForm />
//         </Elements>
//       )}
//     </>
//   );
// }

// export default Payment;