"use client"
import { CartContext } from '@/context/CartContext'
import { currencyFormat } from '@/utils/currency'
import Image from 'next/image'
import CartItem from '@/components/CartItem/CartItem'
import Link from 'next/link'
 import { GlobalContext } from '@/context'

import React, { useContext, useEffect, useState } from 'react'
import CartItemPanel from '@/components/CartItem/CartItem'

export const Cart = ({cart})=>{

const { deleteItem} = useContext(CartContext)
 const {setCartTotal} = useContext(GlobalContext)

const [quantity, setQuantity] = useState(0);

const [total, setTotal] = useState(0)

const [address, setAddress] = useState('')

const [mobile, setMobile] = useState('')

const [callback, setCallback] = useState(false)

useEffect(() => {
    const getTotal = () => {     
      if(cart?.cartItems?.length > 0){
        const amtTotal = cart.cartItems?.reduce((acc, item) => 
      acc + (item.amount)
      ,0)
        setTotal(amtTotal)
        setCartTotal(amtTotal)
      }else{
        setTotal(0)
        setCartTotal(0)
      }    

    }
    getTotal()
},[cart.cartItems, setCartTotal])


return(

<>
<div className="relative w-full h-full py-1 mb-3">
  

    <div className="w-full  h-full py-1 flex flex-col relative  mb-3 ">
      <main className="w-full bg-slate-600">
      
      {cart?.map((item) => (

<CartItemPanel item={item}  key={item._id}/>
))} 
      </main>  
         
   
         
    </div>
</div>

</>
);
};

