

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
import { fetchReferrals } from "@/actions/fetch";
import { refRate } from './../../utils/currency';


const RefList=({patients, slug})=>{
 
    const { replace } = useRouter();
    const pathname = usePathname()
    const [refOrders, setRefOrders] = useState([])
    const [refs, setRefs] = useState([])
    const [loading, setLoading]= useState(false)
   
    const  handleUpdate =async(id, path)=>{
await updateProd(id, path)
    }

    // const { user} = useContext(GlobalContext)
    const [category, setCategory] = useState("")
    const [totalCash, setTotalCash] = useState(0)
    const [totalTransfer, setTotalTransfer] = useState(0)
    const [totalPos, setTotalPos] = useState(0)
   
    useEffect(()=>{
      const getValues = async ()=>{
        let tempPay= await fetchReferrals(slug)
        console.log(tempPay.result)
        setRefs(tempPay.result)
        setRefOrders(patients)
        // const filteredCash = tempPay.filter(p => p.mop==="cash")
        // let allPayments=[]

        //     allPayments =  tempPay.map((i) => i.amountPaid)
        //     const amtTotal = allPayments.reduce((acc, item) => acc + (item),0)
        //   await setTotalCash(amtTotal)    
     
}
getValues()
},[])
    useEffect(()=>{
      const getValues = async ()=>{
        if(category && category.length){
          console.log('cat', category)
           const filteredRef = patients.filter(p => p.referralId===category)

        setRefOrders(filteredRef)
      }
        // let allPayments=[]

        //     allPayments =  tempPay.map((i) => i.amountPaid)
        //     const amtTotal = allPayments.reduce((acc, item) => acc + (item),0)
        //   await setTotalCash(amtTotal)    
     
}
getValues()
},[category])

   

return( 

        <div className="w-full overflow-y-scroll mt-2 overflow-x-scroll">
              <div className="flex sm:flex-col justify-between items-center px-3 my-2 uppercase font-bold" >
             
               <select className="w-full rounded-lg p-2 m-3" name="referral"  value={category} onChange={(e)=>setCategory(e.target.value)}>
          <option value="">Choose Referral</option>
            {
              refs?.map(menu=>(
                <option key={menu._id} id={menu.name} value={menu._id} >{menu.name}</option>
              ))
            }
        </select> 
         <div className="w-full rounded-lg p-2">
            <label
              htmlFor='check_in_date'
              className='block text-sm font-medium text-gray-700'
            >
              Start Date
            </label>
            <input
              type='date'
              // min={new Date().toISOString().split('T')[0]}
              id='check_in_date'
              name='Date1'
              className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
            />
          </div>
         <div className="w-full rounded-lg p-2 ">
            <label
              htmlFor='check_in_date'
              className='block text-sm font-medium text-gray-700'
            >
              End Date
            </label>
            <input
              type='date'
              // min={new Date().toISOString().split('T')[0]}
              id='check_in_date'
              name='Date2'
              className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
              required
            />
          </div>
            <button  className="p-2 w-full m-3 bg-gray-600 text-white font-bold rounded-lg">
             Search Refferal
                </button>
            <button  className="p-2 w-full m-3 bg-black text-white font-bold rounded-lg">
            Print Report
                </button>
          </div>
         
        <Table.Root layout="auto" variant="surface">
    <Table.Header>
      
      <Table.Row>
        <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Referral</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Patient</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Tests</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Amount Paid</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Rate</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Amount Due</Table.ColumnHeaderCell>
      </Table.Row>
    </Table.Header>
  
    <Table.Body>
     {refOrders && refOrders?.map((patient) => (
              
      <Table.Row key={patient?._id}>
                  <Table.Cell>{patient?.bDate}</Table.Cell>
        <Table.RowHeaderCell> {patient?.referral}</Table.RowHeaderCell>
        <Table.RowHeaderCell> {patient?.name}</Table.RowHeaderCell>
         <Table.Cell>
                <ul className="list-disc pl-5">
                  {patient.tests.map((item, i) => (
                    <>
                    <li className='list-none' key={i}>{item.test}</li>
                    </>
                  ))}
                </ul>
                </Table.Cell>
        <Table.Cell>{patient?.amountPaid}</Table.Cell>
        <Table.Cell> 0.2</Table.Cell>
        <Table.Cell>{refRate(patient.amountPaid, 0.2)}</Table.Cell>
    
     
     
       
      </Table.Row>
    ))} 
     <div className="flex justify-end items-end w-full p-2"><h2>Total:</h2>
     <h2 className="">0</h2></div>
       
    </Table.Body>
  </Table.Root>
  </div>
    )
}
export default RefList