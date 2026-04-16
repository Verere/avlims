
"use client"
import { GlobalContext } from "@/context";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {useEffect, useContext, useState } from "react";
import { toast } from "react-toastify";
import { useFormState } from 'react-dom';
import { addReferral } from '@/actions'

 

const ReferralForm = ({slug, clinics}) => {


  const { replace } = useRouter();
  const pathname = usePathname();
const {user} = useContext(GlobalContext)
 const [state, formAction, isPending] = useFormState(addReferral, {});

const [category, setCategory]=useState([])
console.log(clinics)
  
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


    
  return (
    <>

      <form action={formAction} className="flex flex-col justify-between  w-full mt-0 mr-0 ml-0 ">
      <input type="text" placeholder="Enter Referral Name" name="name" className="border mx-2 mb-2 border-gray-400 p-2 w-full" required />
      <input type="text" placeholder="Enter Address" name="address" className="border mx-2 mb-2 border-gray-400 p-2 w-full"  />
    <div className="flex justify-around mt-2 w-full sm:flex-col">
        <select name="clinic" id="cat" className=" mx-2 p-2 w-full"  value={category} onChange={(e)=>setCategory(e.target.value)}>
          <option value="">Choose Clinic</option>
            {
              clinics?.map(menu=>(
                <option key={menu._id} id={menu.name} value={menu.name} >{menu.name}</option>
              ))
            }
        </select> 
            <input type="number" placeholder="Enter Phone Number" name="number" className="border mx-2 border-gray-400 p-2 w-full" />
            <input type="text" placeholder="Enter Email Address" name="email" className="border mx-2 mb-2 border-gray-400 p-2 w-full"  />
         </div>
    <div className="flex justify-around mt-2 w-full sm:flex-col">
      <input type="text" placeholder="Account Name" name="accountName" className="border mx-2 mb-2 border-gray-400 p-2 w-full"  />
      <input type="text" placeholder="Enter Account Number" name="account" className="border mx-2 mb-2 border-gray-400 p-2 w-full"  />
      
     
        
       
       <input type="hidden"  name="user" value={user?.name} /> 
       <input type="hidden"  name="labId" value={user?.labId} /> 
       <input type="hidden"  name="slug" value={slug} /> 
      <input type="hidden"  name="path" value={pathname} />
          
      <button  className="border border-gray-400 rounded-md bg-black text-white mx-2 mb-2  p-2 w-full ">Add New Referral</button>
      </div>
    
      </form>
    </>
  );
};

export default ReferralForm;

