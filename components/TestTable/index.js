

"use client"
import Link from "next/link";
import { Table } from "@radix-ui/themes";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GlobalContext } from "@/context";
import { useContext, useEffect, useState } from "react";

import ProductButton from "../CommonListing/ProductButton";
import { fetchTestsByLabTest } from "@/actions/fetch";

const TestTable=({tests, orderRcpt, slug})=>{

  const initialTests = [...tests]
 
    const { replace } = useRouter();
    const [item, setItem] = useState([...initialTests])
    const [code, setCode]= useState('')


    
    useEffect(()=>{
      if(code!=='')setItem(initialTests)
    },[code])

      const handleSearch = async(code) => {       
        
        if (code && code.length) {
          const items = await fetchTestsByLabTest(slug, code)
          setItem(items)
          setCode("")
        } else{
          setItem(initialTests)
          setCode("")
        }
        
      }

   

return(


        <div className="max-h-[700px] w-full mt-3 overflow-y-scroll" >
          
              <div className="flex justify-between items-center border border-gray-400 w-2/3 mb-2 mx-auto  pl-2 rounded-lg ">
                   <input type="text" placeholder="Search Test" 
                   onChange={(e)=>setCode(e.target.value)} 
                   name="code" className="p-2 outline-none focus:border-none "/>  
                   <button className="flex justify-between items-center bg-gray-400 p-2  rounded-r-lg"
                   onClick={()=>handleSearch(code)}> 
                    Search</button>  
                 </div>
        <Table.Root layout="auto" variant="surface">
    <Table.Header>
      
      <Table.Row>
        <Table.ColumnHeaderCell>Test</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Price</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Category</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Edit</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Add</Table.ColumnHeaderCell>
      </Table.Row>
    </Table.Header>
  
    <Table.Body>
     {item && item?.map((patient) => (
              
      <Table.Row key={patient?._id}>
        <Table.RowHeaderCell> {patient?.name}</Table.RowHeaderCell>
        <Table.Cell>{patient?.price}</Table.Cell>
        <Table.Cell>{patient?.category}</Table.Cell>
       <Table.Cell>
                      <button  onClick={()=>replace(`/dashboard/${slug}/tests?id=${patient._id}`)} className="px-2 py-1 bg-blue-500 text-white font-bold rounded-lg">
                      Edit
                      </button>
                    </Table.Cell>
       <Table.Cell>
       <ProductButton  item={patient} orderRcpt={orderRcpt}/>
                    </Table.Cell>
       
      </Table.Row>
    ))} 
     
      
    </Table.Body>
  </Table.Root>
  </div>
    )
}
export default TestTable