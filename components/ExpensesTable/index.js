
"use client"
import Link from "next/link";
import { Table } from "@radix-ui/themes";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GlobalContext } from "@/context";
import { useContext, useState, useEffect } from "react";

import Search from "../search/search";
import { updateOrderRef } from "@/actions";
import { fetchReferralListByLab } from "@/actions/fetch";
import { currencyFormat } from './../../utils/currency';
import { formatTime } from "@/utils/date";

const ExpensesTable = ({patients}) => {


const { replace } = useRouter();
const pathname = usePathname();
 
    const [code, setCode]= useState('')

    console.log('ee',patients)

 const handleUpdate= async(id, name, ordId, path)=>{

    await updateOrderRef(id, name, ordId, path)
}
    return(
        <div className="w-full mt-3">
            <div className="flex justify-between items-center w-2/3 mb-2 mx-auto  p-2 ">
                  <h2>Total Expenses: {currencyFormat(0)}</h2>
                
                 </div>
        <Table.Root layout="auto" variant="surface">
    <Table.Header>
      
      <Table.Row>
        <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Amount</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Received By</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Approved By</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Time</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>User</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Cancel</Table.ColumnHeaderCell>
      </Table.Row>
    </Table.Header>
  
    <Table.Body>
     {patients && patients?.map((patient) => (
              
      <Table.Row key={patient?._id}>
        <Table.RowHeaderCell> {patient?.description}</Table.RowHeaderCell>
        <Table.Cell>{patient?.amount}</Table.Cell>
        <Table.Cell>{patient?.receivedBy}</Table.Cell>
        <Table.Cell>{patient?.authorisedBy}</Table.Cell>
        <Table.Cell>{patient?.bDate}</Table.Cell>
        <Table.Cell>{formatTime(patient?.createdAt)}</Table.Cell>
        <Table.Cell>{patient?.user}</Table.Cell>
     
       <Table.Cell>
       <button onClick={()=>handleUpdate(patient?._id,  pathname)} className="px-2 py-1 bg-red-500 text-white font-bold rounded-lg">
       Remove
                      </button>
                    </Table.Cell>
       
      </Table.Row>
    ))} 
     
      
    </Table.Body>
  </Table.Root>
  </div>
    )
}
export default ExpensesTable