

"use client"
import Link from "next/link";
import { Table } from "@radix-ui/themes";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const CategoryTable=({categories})=>{
 
    const { replace } = useRouter();

return(

   
    

        <div className="w-full mt-3">
        <Table.Root layout="auto" variant="surface">
    <Table.Header>
      
      <Table.Row>
        <Table.ColumnHeaderCell>Category</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Group</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Edit</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Add</Table.ColumnHeaderCell>
      </Table.Row>
    </Table.Header>
  
    <Table.Body>
     {categories && categories?.map((patient) => (
              
      <Table.Row key={patient?._id}>
        <Table.RowHeaderCell> {patient?.name}</Table.RowHeaderCell>
       
        <Table.Cell>{patient?.group}</Table.Cell>
       <Table.Cell>
                      <button  className="px-2 py-1 bg-blue-500 text-white font-bold rounded-lg">
                      Edit
                      </button>
                    </Table.Cell>
       <Table.Cell>
                      <button  className="px-2 py-1 bg-blue-500 text-white font-bold rounded-lg">
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
export default CategoryTable