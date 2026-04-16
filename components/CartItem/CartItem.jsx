import { updateSalesCancel } from '@/actions/fetch'
import { GlobalContext } from '@/context'
import { CartContext } from '@/context/CartContext'
import { currencyFormat } from '@/utils/currency'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useContext, useEffect, useState } from 'react'

const CartItemPanel = ({item}) => {

  const pathname = usePathname();
    const {cart, incr, decr, deleteItem} = useContext(CartContext)
     const { user, payment, setPayment, setBal} = useContext(GlobalContext)

   const [loading, setLoading] = useState(false)

  
  const increaseQty = (cart, item) => {
     incr(cart, item);
   
};

const decreaseQty = (cart, item) => {
  if(item.qty > 1){
    decr(cart, item);
  }
  };

  const handleCancel = async(item, pathname)=> {
  if(payment){
    toast.warn('Payment has been taken for this order. Create new Order')
  }else{

    await setLoading(true)
    await updateSalesCancel(item, pathname)
  }
}
  return (
   <>
<article key={item._id} className="border border-gray-200 bg-white shadow-sm rounded mb-1 p-2">
                  <div   className="flex flex-wrap gap-1  justify-between items-center">
                      <figure className="flex leading-5">
                       
                        <figcaption className="">
                          <p className=" font-bold hover:text-blue-600">
                             {item.test}
                          </p>
                      
                        </figcaption>
                      </figure>                  
                   
                    <div className="flex items-center justify-between ">
                  
                        <div className="flex flex-col mr-3">
                        <p className="font-semibold not-italic text-blue-600 text-sm ">{currencyFormat(item.price)}</p>
                        </div>
                        <a 
                         onClick={ () => handleCancel(item, pathname) }
                        className="px-4 py-2 inline-block text-red-600 bg-white shadow-sm border border-gray-200 rounded-md hover:bg-gray-100 cursor-pointer">
                          Remove
                        </a>
                    </div>
                  </div>

              </article>
              </>
  )
}

export default CartItemPanel;

