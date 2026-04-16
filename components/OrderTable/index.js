
"use client"
import Link from "next/link";
import { Table } from "@radix-ui/themes";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GlobalContext } from "@/context";
import {useEffect,  useContext, useState } from "react";

import Search from "../search/search";
import { useFormState } from 'react-dom';
import { addOrder } from "@/actions";
import { toast } from "react-toastify";
import { fetchPatientListByLab } from "@/actions/fetch";
import { currencyFormat } from './../../utils/currency';
import Heading from "../Heading";
import { formatTime } from "@/utils/date";

const OrderTable = ({patients}) => {
  const [slug, setSlug]=useState(null)
  const {user }= useContext(GlobalContext)
  const [state, formAction, isPending] = useFormState(addOrder, {});
     const { replace } = useRouter();
   const pat="patient"
   const pathname = usePathname();

useEffect(()=>{
  const getSlug=()=>{
  const slg = JSON.parse(localStorage.getItem('slug'))
setSlug(slg)
console.log(slug)
  }
  getSlug()
})
   useEffect(()=>{
    const getState=()=>{
  
  if(state.error){
   toast.error(state.error)
  }
  if(state.success){
   toast.success(state.success)
  }
  }
  getState()
   },[state])
  const initialTests = [...patients]
 
    const [item, setItem] = useState([...initialTests])
    const [code, setCode]= useState('')

    useEffect(()=>{
      if(code!=='')setItem(initialTests)
    },[code])

      const handleSearch = async(code) => {       
        
        if (code && code.length) {
          const items = await fetchPatientListByLab(slug, code)
          setItem(items)
          setCode("")
        } else{
          setItem(initialTests)
          setCode("")
        }
        
      }

    return (
        <div className="w-full overflow-y-scroll -mt-[56px] overflow-x-scroll">
                  <Heading title="Tests Made"/>
                   
              <Table.Root layout="auto" variant="surface">
          <Table.Header>
            
            <Table.Row>
              <Table.ColumnHeaderCell>Order Number.</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Patient</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Tests</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Test Amount</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Amount Paid</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Time</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>User</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
        
          <Table.Body>
           {patients && patients?.map((order, idx) => (
                    
            <Table.Row key={order?._id}>
              <Table.RowHeaderCell> {order.orderNum}</Table.RowHeaderCell>
              <Table.RowHeaderCell> {order.name}</Table.RowHeaderCell>
              <Table.Cell>
                <ul className="list-disc pl-5">
                  {order.tests.map((item, i) => (
                    <>
                    <li className='list-none' key={i}>{item.test}</li>
                    </>
                  ))}
                </ul>
                </Table.Cell>
              <Table.Cell>{currencyFormat(order?.amount)}</Table.Cell>
              <Table.Cell>{currencyFormat(order?.amountPaid)}</Table.Cell>
              <Table.Cell>{order?.bDate}</Table.Cell>
              <Table.Cell>{formatTime(order?.createdAt)}</Table.Cell>
              <Table.Cell>{order?.user}</Table.Cell>
          
           
           
             
            </Table.Row>
          ))} 
           
            
          </Table.Body>
        </Table.Root>
        </div>
             
  );
}
export default OrderTable