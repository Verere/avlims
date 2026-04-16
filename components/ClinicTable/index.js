
"use client"
import { updateOrderClinic } from "@/actions";
import Link from "next/link";
import { Table } from "@radix-ui/themes";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GlobalContext } from "@/context";
import { useContext } from "react";
import Search from "../search/search";


const ClinicTable = ({patients, orderRcpt}) => {
 
const clinic ="clinic"

     const { replace } = useRouter();
     const pathname = usePathname();
      const handleUpdate= async(id, name, ordId, path)=>{

         await updateOrderClinic(id, name, ordId, path)
    }
    return(
        <div className="w-full mt-3">
             <Search placeholder="Search Clinic" p={clinic}/>
        <Table.Root layout="auto" variant="surface">
    <Table.Header>
      
      <Table.Row>
        <Table.ColumnHeaderCell>Clinic</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Address</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Edit</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Test</Table.ColumnHeaderCell>
      </Table.Row>
    </Table.Header>
  
    <Table.Body>
     {patients && patients?.map((patient) => (
              
      <Table.Row key={patient?._id}>
        <Table.RowHeaderCell> {patient?.name}</Table.RowHeaderCell>
        <Table.Cell>{patient?.address}</Table.Cell>
       <Table.Cell>
                      <button  className="px-2 py-1 bg-blue-500 text-white font-bold rounded-lg">
                      Edit
                      </button>
                    </Table.Cell>
       <Table.Cell>
                      <button onClick={()=>handleUpdate(patient?._id, patient?.name, orderRcpt[0]?._id, pathname)} className="px-2 py-1 bg-blue-500 text-white font-bold rounded-lg">
                     Add
                      </button>
                    </Table.Cell>
       
      </Table.Row>
    ))} 
     
      
    </Table.Body>
  </Table.Root>
  </div>
    )
}
export default ClinicTable