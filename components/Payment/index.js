'use client'

import { addPayment } from "@/actions"
import { GlobalContext } from "@/context"
import { useContext, useEffect, useState } from "react"
import { toast } from "react-toastify"
import { useFormState } from 'react-dom';
import {    Popover,    PopoverContent,    PopoverTrigger,  } from "@/components/ui/popover"
import PrintPage from "../Print"

const PaymentPage=({slug, orderRcpt, cart, lab, pathname})=>{
    const {cartTotal, } = useContext(GlobalContext)
    const [values, setValues]=useState("")
    const [amount, setAmount]=useState(cartTotal)
    const [payment, setPayment]= useState([])
    const [state, formAction, isPending] = useFormState(addPayment, {});

    // const getPayment = async()=>{
    //   const pay = await fetchPaymentByOrder(orderRcpt[0]?._id)
    //   await setPayment(pay)
    // }

    useEffect(()=>{
        const getState=async()=>{

            if(state.error){
                toast.error(state.error)
            }
            if(state.success){
                toast.success(state.success)
            }
        }
        getState()
    },[state])
    return(
        <div className="flex flex-col -mt-[50px]">
        <form action={formAction}>
        <div className="flex space-x-2 items-center">
            <label
              htmlFor='amountPaid'
              className='block text-sm font-medium text-gray-700'
            >
             Amount Paid:
            </label>
            <input type="number" name="amountPaid" value={amount}  onChange={async(e)=>setAmount(e.target.value)} className='px-2 py-1 my-2'/>

          </div>
        <div className="flex space-x-2 items-center">
            <label
              htmlFor='mop'
              className='block text-sm font-medium text-gray-700'
            >
             Method of Payment:
            </label>
            <select className="mt-2 px-2 py-2 " name="mop" id="mop"  value={values} onChange={(e)=>setValues(e.target.value)} >
        
        <option   value="cash" >Cash</option>
        <option   value="transfer" >Transfer</option>
        <option   value="pos" >POS</option>
     
</select>
          </div>

                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="patient" value={orderRcpt[0]?.name} />
                <input type="hidden" name="order" value={orderRcpt[0]?._id} />
                <input type="hidden" name="orderNo" value={orderRcpt[0]?.orderNum} />
                <input type="hidden" name="testAmount" value={cartTotal} />
                <input type="hidden" name="user" value={orderRcpt[0]?.user} />
                <input type="hidden" name="path" value={pathname} />
                <button  className="p-2 w-full mt-2 bg-green-600 text-white font-bold rounded-bg">
               Make Payment
                </button>
        </form>
               
                <Popover>
          <PopoverTrigger>
          <button  className="p-2 w-full mt-2 bg-black text-white font-bold rounded-bg">
              Print Receipt
                </button>
          </PopoverTrigger>
          <PopoverContent> 
          <PrintPage cart={cart} order={orderRcpt} lab={lab}/>
              </PopoverContent>
        </Popover>
        </div>
    )
}
export default PaymentPage