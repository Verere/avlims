"use client"

import { GlobalContext } from "@/context"
import { CartContext } from "@/context/CartContext"
import { Table } from "@radix-ui/themes"
import { useContext, useRef } from "react"
import { currencyFormat } from '@/utils/currency'

import { useReactToPrint } from 'react-to-print';

const PrintPage =({cart, order, lab})=>{
    // const {order, }= useContext(CartContext)
    // const {cartTotal, }= useContext(GlobalContext)

    const contentRef = useRef(null);
    const reactToPrintFn = useReactToPrint({ contentRef });

    return(
        <>
        <div ref={contentRef}>
     <div >
        <h2 className="font-bold text-lg uppercase mx-auto text-center">{lab?.name}</h2>
        <p className="text-center">{lab?.address}</p>
        <p className="text-sm font-bold mb-1 text-center border-b-black border-b-4">{lab?.number}</p>
        <h4 className="text-sm pt-1">Date : {order[0]?.bDate}</h4>
        <h4 className="text-sm pt-1">Patient : {order[0]?.name}</h4>
        <p className="text-sm pb-1">Rcpt No.: {order[0]?.orderNum}</p>
        <hr/>
     </div>
     <div className="mx-auto px-1">
        <Table.Root>
        <Table.Header>        
          <Table.Row>
            <Table.ColumnHeaderCell>TEST</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>PRICE</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
      
        <Table.Body>
        {cart?.map((item) => (
             <>     
          <Table.Row key={item?._id}>
            <Table.RowHeaderCell> {item?.test}</Table.RowHeaderCell>
            <Table.Cell>{item?.price}</Table.Cell>
           
          </Table.Row>
          </>
        ))}
         
          
        </Table.Body>
      </Table.Root>
      </div>
      <div className="flex flex-col" >
      <div className="flex justify-between px-1 uppercase font-bold" >
        <p>Total :</p>
       <p> {currencyFormat(order[0]?.amount)}</p>
       </div>
      <>
      <div className="flex justify-between px-1 uppercase font-bold text-sm" >
        <p>Amount Paid :</p>
       <p> {currencyFormat(order[0]?.amountPaid)}</p>
       </div>
      {/* <div className="flex justify-around px-1 uppercase font-bold" >
        <p>mop :</p>
       <p> {payment[0]?.mop}</p>
       </div> */}
      <div className="flex justify-between px-1 uppercase font-bold" >
        <p>balance :</p>
       <p> {currencyFormat(order[0]?.bal)}</p>
       </div>
      </>
       
      </div >
      <p className="text-center mt-3"> Thanks for your patronage</p>
      </div>

      <button onClick={reactToPrintFn} className='bg-black text-white px-2  py-1 rounded-lg uppercase'>Print</button>
   </> )
}
export default PrintPage