
"use client"
import Link from "next/link";
import { Table } from "@radix-ui/themes";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GlobalContext } from "@/context";
import { useContext, useState, useEffect } from "react";

import Search from "../search/search";
import { CancelRef, updateOrderRef } from "@/actions";
import { fetchReferralListByLab } from "@/actions/fetch";

const ReferralTable = ({patients, orderRcpt}) => {


const { replace } = useRouter();
const pathname = usePathname();
  const initialTests = [...patients]
 
    const [item, setItem] = useState([...initialTests])
    const [code, setCode]= useState('')

    useEffect(()=>{
      if(code!=='')setItem(initialTests)
    },[code])

      const handleSearch = async(code) => {       
        
        if (code && code.length) {
          const items = await fetchReferralListByLab(slug, code)
          setItem(items)
          setCode("")
        } else{
          setItem(initialTests)
          setCode("")
        }
        
      }

 const handleUpdate= async(id, name, ordId, path)=>{

    await updateOrderRef(id, name, ordId, path)
}
    return(
        <div className="w-full mt-3">
            <div className="flex justify-between items-center border border-gray-400 w-2/3 mb-2 mx-auto  pl-2 rounded-lg ">
                   <input type="text" placeholder="Search Referral" 
                   onChange={(e)=>setCode(e.target.value)} 
                   name="code" className="p-2 outline-none focus:border-none "/>  
                   <button className="flex justify-between items-center bg-gray-400 p-2  rounded-r-lg"
                   onClick={()=>handleSearch(code)}> 
                    Search</button>  
                 </div>
        <Table.Root layout="auto" variant="surface">
    <Table.Header>
      
      <Table.Row>
        <Table.ColumnHeaderCell>Referral</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Ref ID.</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Address</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Number</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Clinic</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Edit</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Test</Table.ColumnHeaderCell>
      </Table.Row>
    </Table.Header>
  
    <Table.Body>
     {patients && patients?.map((patient) => (
              
      <Table.Row key={patient?._id}>
        <Table.RowHeaderCell> {patient?.name}</Table.RowHeaderCell>
        <Table.Cell>{patient?.regNumber}</Table.Cell>
        <Table.Cell>{patient?.address}</Table.Cell>
        <Table.Cell>{patient?.number}</Table.Cell>
        <Table.Cell>{patient?.email}</Table.Cell>
        <Table.Cell>{patient?.clinic}</Table.Cell>
       <Table.Cell>
       <button onClick={()=>handleUpdate(patient?._id, patient?.name, orderRcpt[0]?._id, pathname)} className="px-2 py-1 bg-blue-500 text-white font-bold rounded-lg">
       Add
                      </button>
                    </Table.Cell>
       <Table.Cell>
                      <button onClick={()=>CancelRef(patient?._id,  pathname)}  className="px-2 py-1 bg-red-500 text-white font-bold rounded-lg">
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
export default ReferralTable