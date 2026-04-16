

"use client"
import Link from "next/link";
import { Table } from "@radix-ui/themes";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { updateProd, updateProdPrice } from "@/actions";
import { FaEdit } from "react-icons/fa";
import { useEffect, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import Heading from "../Heading";
import { currencyFormat } from "@/utils/currency";
import { formatTime } from "@/utils/date";


const PaymentTable=({payments, slug})=>{
 
    const { replace } = useRouter();
    const pathname = usePathname()
    const [price, setPrice] = useState(0)
    const [qty, setQty] = useState(0)
    const [loading, setLoading]= useState(false)
   
    const  handleUpdate =async(id, path)=>{
await updateProd(id, path)
    }

    // const { user} = useContext(GlobalContext)
    const [totalPayment, setTotalPayment] = useState(0)
    const [totalCash, setTotalCash] = useState(0)
    const [totalTransfer, setTotalTransfer] = useState(0)
    const [totalPos, setTotalPos] = useState(0)
   
    useEffect(()=>{
      const getValues = async ()=>{
        let tempPay= payments
        const filteredCash = payments.filter(p => p.mop==="cash")
        const filteredPos = payments.filter(p => p.mop==="pos")
        const filteredTransfer = payments.filter(p => p.mop==="transfer")
        let allPayments=[]
            allPayments =  tempPay.map((i) => i.amountPaid)
            const amtTotal = allPayments.reduce((acc, item) => acc + (item),0)
          await setTotalPayment(amtTotal)    
     
         
          let tempCash=[]
          tempCash =  filteredCash.map((i) => i.amountPaid)
          const cashTotal = tempCash.reduce((acc, item) => acc + (item),0)
        await setTotalCash(cashTotal)

          let tempPos=[]
          tempPos =  filteredPos.map((i) => i.amountPaid)
          const posTotal = tempPos.reduce((acc, item) => acc + (item),0)
        await setTotalPos(posTotal)

          let tempTrans=[]
          tempTrans =  filteredTransfer.map((i) => i.amountPaid)
          const tTotal = tempTrans.reduce((acc, item) => acc + (item),0)
        await setTotalTransfer(tTotal)
}
getValues()
},[payments])

    const handleEdit=async(id, price, qty, path)=>{
      setLoading(true)
     const update = await updateProdPrice(id, price, qty, path)
     setLoading(false)
     setPrice(0)
     setQty(0)
    }

return( 

        <div className="w-full overflow-y-scroll -mt-[56px] overflow-x-scroll">
            <Heading title="Payments"/>
              <div className="flex flex-wrap sm:flex-col justify-between px-3 my-3 uppercase font-bold" >
              <div className="flex justify-around px-2 " >
                    <p>Cash :</p>
                   <p> {currencyFormat(totalCash)}</p>
                   </div>
              <div className="flex justify-around px-2 " >
                    <p>Pos :</p>
                   <p> {currencyFormat(totalPos)}</p>
                   </div>
              <div className="flex justify-around px-2 " >
                    <p>Transfer :</p>
                   <p> {currencyFormat(totalTransfer)}</p>
                   </div>
              <div className="flex justify-around px-2 " >
                    <p>Total Payment :</p>
                   <p> {currencyFormat(totalPayment)}</p>
                   </div>
                   </div>
        <Table.Root layout="auto" variant="surface">
    <Table.Header>
      
      <Table.Row>
        <Table.ColumnHeaderCell>Order No.</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Patient</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Amount Paid</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>MOP</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Time</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>User</Table.ColumnHeaderCell>
      </Table.Row>
    </Table.Header>
  
    <Table.Body>
     {payments && payments?.map((patient) => (
              
      <Table.Row key={patient?._id}>
        <Table.RowHeaderCell> {patient?.orderNo}</Table.RowHeaderCell>
        <Table.RowHeaderCell> {patient?.patient}</Table.RowHeaderCell>
        <Table.Cell>{patient?.amountPaid}</Table.Cell>
        <Table.Cell>{patient?.mop}</Table.Cell>
        <Table.Cell>{patient?.bDate}</Table.Cell>
        <Table.Cell>{formatTime(patient?.createdAt)}</Table.Cell>
    
     
     
            <Table.Cell> <button className="bg-green-700 px-2 py-1 text-white font-bold rounded-lg" onClick={()=>replace(`/${slug}/dashboard/stock?id=${patient._id}`)}>View Sales</button></Table.Cell>
       
      </Table.Row>
    ))} 
     
      
    </Table.Body>
  </Table.Root>
  </div>
    )
}
export default PaymentTable