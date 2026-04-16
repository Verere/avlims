
"use client"
import { GlobalContext } from "@/context";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {useEffect, useContext, useState } from "react";
import { toast } from "react-toastify";
import { useFormState } from 'react-dom';
import { addCategory } from "@/actions";

 

const CategoryForm = ({groups, slug}) => {


  const { replace } = useRouter();
  const pathname = usePathname();
const {user} = useContext(GlobalContext)
 const [state, formAction, isPending] = useFormState(addCategory, {});

const [category, setCategory]=useState([])
  
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
    <div className="flex justify-around mt-2 w-full sm:flex-col">
      <input type="text" placeholder="Enter Category" name="name" className="border mx-2 mb-2 border-gray-400 p-2 w-full" required />
    {/* <select name="group"   value={category} onChange={(e)=>setCategory(e.target.value)}>
          <option value="">Choose Group</option>
            {
              groups?.map(menu=>(
                <option key={menu._id} id={menu.name} value={menu.name} >{menu.name}</option>
              ))
            }
        </select> */}
       </div>
      <div className="flex justify-between w-full mt-2">
     
        
       
       <input type="hidden"  name="slug" value={slug} /> 
      <input type="hidden"  name="path" value={pathname} />
          
      <button  className="border border-gray-400 rounded-md bg-black text-white p-2 ">Add New Category</button>
      </div>
    
      </form>
    </>
  );
};

export default CategoryForm;

