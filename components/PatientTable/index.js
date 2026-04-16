
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
import { updatePatient } from "@/actions/index";
import { FaEdit } from "react-icons/fa";

const PatientTable = ({patients}) => {
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
    const [show, setShow]= useState(false)

    useEffect(()=>{
      // if( code !=='' )setItem(initialTests)
        if (code && code.length) {
          setItem(items)
        } else{
          setItem(initialTests)
        }
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

      const  handleUpdate =async(id, path)=>{
await updatePatient(id, path)
    }

    return(
        <div className="max-h-[700px] w-full mt-3 overflow-y-scroll" >
          <div className="flex justify-between items-center  w-4/5 mb-2 mx-auto  ">
          <div className="flex justify-between items-center border border-gray-400 mx-auto  pl-2 rounded-lg ">
                   <input type="text" placeholder="Search Patient" 
                   onChange={(e)=>setCode(e.target.value)} 
                   name="code" className="p-2 outline-none focus:border-none "/>  
                   <button className="flex justify-between items-center bg-gray-400 p-2  rounded-r-lg"
                   onClick={()=>handleSearch(code)}> 
                    Search</button>  
     
                 </div>
                     <button onClick={()=>replace(`/dashboard/${slug}/patient/new`)}  className="border border-gray-400 rounded-md bg-black text-white p-2">New Patient</button>
                 </div>
        <Table.Root layout="auto" variant="surface">
    <Table.Header>
      
      <Table.Row>
        {show &&<Table.ColumnHeaderCell>Reg No.</Table.ColumnHeaderCell>}
        <Table.ColumnHeaderCell>Patient</Table.ColumnHeaderCell>
       <Table.ColumnHeaderCell>Age</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Gender</Table.ColumnHeaderCell>
      {show &&   <Table.ColumnHeaderCell>Address</Table.ColumnHeaderCell>}
        <Table.ColumnHeaderCell>Number</Table.ColumnHeaderCell>
        {show &&<Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>}
        <Table.ColumnHeaderCell>Test</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Edit</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Delete</Table.ColumnHeaderCell>
      </Table.Row>
    </Table.Header>
  
    <Table.Body>
     {item && item?.map((patient) => (
              
      <Table.Row key={patient?._id}>
      {show &&   <Table.Cell>{patient?.regNumber}</Table.Cell>}
        <Table.RowHeaderCell> {patient?.name}</Table.RowHeaderCell>
        <Table.Cell>{patient?.age}</Table.Cell>
        <Table.Cell>{patient?.gender}</Table.Cell>
       {show &&  <Table.Cell>{patient?.address}</Table.Cell>}
        <Table.Cell>{patient?.number}</Table.Cell>
       {show &&  <Table.Cell>{patient?.email}</Table.Cell>}
       <Table.Cell>
                     
                      <form action={formAction}>
                            <input type="hidden" name="slug" value={slug} />
                            <input type="hidden" name="patientId" value={patient?._id}/>
                            <input type="hidden" name="name" value={patient?.name}/>
                            <input type="hidden" name="phone" value={patient?.number}/>
                            <input type="hidden" name="address" value={patient?.address}/>
                            <input type="hidden" name="user" value={user} />
                            <input type="hidden" name="path" value={pathname} />   
   <button onClick={()=>replace(`/dashboard/${slug}/reg`)} className="px-2 py-1 bg-blue-700 text-white font-bold rounded-lg">
                      Test
                      </button>
                          </form>
                    </Table.Cell>
       <Table.Cell>
       
          <button   className="p-2  bg-blue-500 text-white font-bold rounded-lg" onClick={()=>replace(`/dashboard/${slug}/patient?id=${patient._id}`)}>
                      <FaEdit/>

                      </button>

           
        </Table.Cell>
      
       <Table.Cell>
                      <button onClick={()=>handleUpdate(patient._id, pathname)}  className="px-2 py-1 bg-red-500 text-white font-bold rounded-lg">
                      Delete
                      </button>
                    </Table.Cell>
       
      </Table.Row>
    ))} 
     
      
    </Table.Body>
  </Table.Root>
  </div>
    )
}
export default PatientTable