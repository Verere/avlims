
"use client"
import { GlobalContext } from "@/context";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {useEffect, useContext, useState } from "react";
import { toast } from "react-toastify";
import { useFormState } from 'react-dom';
import { addExpenses } from "@/actions";

 
// import moment from 'moment'

const EodForm = ({slug}) => {
  
//   var date = moment();
// const bDate = date.format('D/MM/YYYY')

  const { replace } = useRouter();
  const pathname = usePathname();
const {user} = useContext(GlobalContext)
 const [state, formAction, isPending] = useFormState(addExpenses, {});
 const [loading, setLoading]= useState(false)


 useEffect(()=>{
  if(!user)replace(`/login`)
 },[user])

 useEffect(()=>{
  const getState=()=>{

if(state.error){
 toast.error(state.error)
 setLoading(false)
}
if(state.success){
 toast.success(state.success)
 setLoading(false)
}
}
getState()
 },[state])


    
  return (
    <>

      <form action={formAction} className="flex flex-col justify-between  w-full mt-0 mr-0 ml-0 ">
      <textarea type="text" placeholder="Enter Expenses Description" name="description" className="border mx-2 mb-2 border-gray-400 p-2 w-full" required />
     
      <div className="flex sm:flex-col justify-between w-full mt-2">

      <input type="number" placeholder="Enter Amount" name="amount" className="border mx-2 mb-2 border-gray-400 p-2 w-full" required />
      <input type="text" placeholder="Received by" name="receivedBy" className="border mx-2 mb-2 border-gray-400 p-2 w-full" required />
      <input type="text" placeholder="Authorised by" name="authorisedBy" className="border mx-2 mb-2 border-gray-400 p-2 w-full" required />
       <input type="hidden"  name="slug" value={slug} /> 
    
       
       <input type="hidden"  name="user" value={user?.name} /> 
      <input type="hidden"  name="path" value={pathname} />
          
      <button onClick={()=>setLoading(true)} className="border w-full border-gray-400 rounded-md bg-black text-white p-2 mx-2 mb-2">{loading ? '...Saving' : 'Save Expenses'}</button>
      </div>
    
      </form>
    </>
  );
};

export default EodForm;

