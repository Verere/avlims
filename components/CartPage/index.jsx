"use client"
import { CartContext } from '@/context/CartContext'
import { currencyFormat } from '@/utils/currency'
import Image from 'next/image'
import React, { useContext, useEffect, useState } from 'react'
import CartItem from '@/components/CartItem/CartItem'
import Link from 'next/link'
import { GlobalContext } from '@/context'


const CartIndexPage = () => {

  const {cart, deleteItem} = useContext(CartContext)
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


  return (
    <>
      <section className="py-5 sm:py-7 bg-blue-100">
        <div className="container max-w-screen-xl mx-auto px-4">
          <h2 className="text-3xl font-semibold mb-2">{cart?.cartItems?.length } Item(s) in Cart</h2>
        </div>
      </section>

      <section className="py-10">
        <div className="container max-w-screen-xl mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-4">
            <main className="md:w-3/4">
            {cart?.cartItems?.map((item) => (

                    <CartItem item={item} key={item.id}/>
                    ))}
            </main>
            <aside className="md:w-1/4">
              <article className="border border-gray-200 bg-white shadow-sm rounded mb-5 p-3 lg:p-5">
                <ul className="mb-5">
                  <li className="flex justify-between text-gray-600  mb-1">
                    <span>Total price:</span>
                    <span>{currencyFormat(total)}</span>
                  </li>
               
                  <li className="flex justify-between text-gray-600  mb-1">
                    <span>TAX:</span>
                    <span>{currencyFormat(0)}</span>
                  </li>
                  <li className="text-lg font-bold border-t flex justify-between mt-3 pt-3">
                    <span>Total Amount:</span>
                    <span>{currencyFormat(total)}</span>
                  </li>
                  <li className="border-t  pt-3">
                  <p className="mt-1 text-gray-400">Delivery fees are not yet added</p>
                  </li>
                </ul>
                <Link
                 style={{
                 
                  backgroundColor: "rgb(60, 58, 58)",
                 
                }}
                 href="/checkout" className="px-4 py-3 mb-2 inline-block text-lg w-full text-center font-medium text-white border border-transparent rounded-md hover:bg-green-700 cursor-pointer">
                  Checkout
                  </Link>


                <Link
                 href="/"
                 style={{
                  color: "goldenRod",
                 
                 
                }}
                  className="px-4 py-3 inline-block text-lg w-full text-center font-medium bg-white shadow-sm border border-gray-200 rounded-md hover:bg-gray-100"
                >
                  Continue Shopping
                </Link>
              </article>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
};

export default CartIndexPage
