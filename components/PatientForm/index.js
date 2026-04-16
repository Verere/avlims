
"use client"
import { GlobalContext } from "@/context";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {useEffect, useContext, useState } from "react";
import { toast } from "react-toastify";
import { useFormState } from 'react-dom';
import { addPatient } from "@/actions";

 

const PatientForm = ({slug}) => {

const [category, setCategory]=useState("")
  const { replace, } = useRouter();
  const pathname = usePathname();
  // const user= JSON.parse(localStorage.getItem('user'))
  const [loading, setLoading]=useState(false)
   const {user }= useContext(GlobalContext)
 const [state, formAction, isPending] = useFormState(addPatient, {});
 console.log('f',user)
  useEffect(()=>{
  const  getUser = ()=>{

    // if(!user)replace("/login")
    }
    getUser()
  },[user, replace])
 useEffect(()=>{
  const getState=()=>{

if(state.error){
 toast.error(state.error)
 setLoading(false)
}
if(state.success){
 toast.success("patient added")
 setLoading(false)
}
}
getState()
 },[state])
   
  return (
    <div>

      <form action={formAction} className="flex flex-col justify-between  w-full mt-0 mr-0 ml-0 ">
      <input type="text" placeholder="Enter Patient Name" name="name" className="border mx-2 mb-2 border-gray-400 p-2 w-full" required />
      <input type="text" placeholder="Enter Address" name="address" className="border mx-2 border-gray-400 p-2 w-full" />
    <div className="flex justify-between mt-2 w-full sm:flex-col">
      <input type="text" placeholder="Enter Patient Age" name="age" className="border mx-2 border-gray-400 p-2 w-full"  />
        <select name="gender" className="p-2"  value={category} onChange={(e)=>setCategory(e.target.value)}>
          <option value="">Choose Gender</option>
                <option  value="Male" >Male</option>
                <option  value="Female" >Female</option>
        </select> 
      <input type="text" placeholder="Enter Phone Number" name="number" className="border mx-2 border-gray-400 p-2 w-full" />
      <input type="text" placeholder="Enter enail" name="email" className="border mx-2 border-gray-400 p-2 w-full" />
     
     
        
       
       <input type="hidden"  name="labId" value={user?.labId} /> 
       <input type="hidden"  name="slug" value={slug} /> 
      <input type="hidden"  name="path" value={pathname} />
          
      <button onClick={()=>setLoading(true)}  className="border border-gray-400 rounded-md bg-black text-white p-2 w-full">{ loading ? "loading" :"Add New Patient"}</button>
      </div>
    
      </form>
      <div className="flex justify-between mx-auto mt-3"> 
      <button onClick={()=>replace(`/dashboard/${slug}/patient`)}  className="border border-gray-400 rounded-md bg-black text-white p-2 w-full">View Patient List</button>
      <button onClick={()=>replace(`/dashboard/${slug}/reg`)}  className="border border-gray-100 rounded-md bg-black text-white p-2 w-full">Register Test</button>

      </div>
    </div>
  );
};

export default PatientForm;

