"use client"
import { CartContext } from '@/context/CartContext'
import { currencyFormat } from '@/utils/currency'
 import { GlobalContext } from '@/context'

import React, { useContext, useEffect, useState } from 'react'
import { fetchPaymentByOrder } from '@/actions/fetch'

export const CartTotal = ({cart})=>{

 const {setCartTotal,  payment, setPayment,
  bal, setBal} = useContext(GlobalContext)
 const {order, setOrder} = useContext(CartContext)

const [total, setTotal] = useState(0)



useEffect(()=>{
  
  const getPayment= async()=>{
 
   const Payments = await fetchPaymentByOrder(order[0]?._id)
   console.log('p', Payments)
   let allPayments=[]
    allPayments =  Payments.map((i) => i.amountPaid)  
       const paymentt = allPayments.reduce((acc, item) => 
       acc + (item)
       ,0)
       setPayment(paymentt)
       const t = total -payment
       setBal(t)
       setCartTotal(total)
  }
  getPayment()
})

useEffect(() => {
    const getTotal = () => {     
      const newData= cart   
      let newCartItems=[]
      newCartItems =  newData.map((i) =>
        i.price)
    
          if(cart?.length > 0){
            const amtTotal = newCartItems.reduce((acc, item) => 
          acc + (item)
          ,0)
    
            setTotal(amtTotal)
            
      }   

    }
    getTotal()
},[cart, setCartTotal])


return(

<>
<div className=" w-full border flex  sm:flex-col justify-between px-2 border-gray-200 bg-white  mt-5 shadow-sm rounded text-sm font-bold border-t ">
        <h3 className='flex'>Test Total :
        <span> {"  "}{currencyFormat(total)}</span> </h3>
        <h3 className='flex text-green-700'>Paid :
        <span> {"  "}{currencyFormat(payment)}</span> </h3>
        <h3 className='flex text-orange-500'>Balance :
        <span> {"  "}{currencyFormat(bal)}</span> </h3>
            </div>      
            </>
);
};

