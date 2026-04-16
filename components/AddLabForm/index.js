"use client"
import { addLab } from '@/actions';
import { GlobalContext } from '@/context';
import { useContext, useEffect, useState } from 'react';
import { useFormState } from 'react-dom';
import { toast } from 'react-toastify';

const AddLabForm =()=>{
    const [state, formAction, isPending] = useFormState(addLab, {});

    // const {user, setUser} = useContext(GlobalContext) ?? []
    const [user, setUser]= useState([])

    useEffect(()=>{
      const getUser = ()=>{
        
       const User= JSON.parse(localStorage.getItem("user"))
       setUser(User)
      }
      getUser()
    })
  
    useEffect(()=>{
        console.log(state)
   if(state.error){
    toast.error(state.error)
  }
   if(state.success){
    toast.success(state.success)
  }
    },[state])
    return(
        <div className='p-3'>

        <form action={formAction} className="flex flex-col w-full mt-0 mr-0 ml-0 space-y-8 z-[-9]">
        <h3 className="text-center font-bold uppercase pt-4"> Create New Lab</h3>
        
        <div className="w-full mt-0 mr-0 ml-0 space-y-8">
  
         
          <input type="text" placeholder="Enter Hotel Name" name="name" className="border border-gray-400 p-2 w-full" required />
      <input type="text" placeholder="Enter Lab Name as Slug" name="slug" className="border border-gray-400 p-2 w-full" required />
          
          <textarea
            className="border border-gray-400 p-2 w-full"
            required
            name="address"
            id="address"
            rows="3"
            placeholder="Enter Hotel Address"
  
            ></textarea>
  
  
         <div className="flex flex-col gap-5 md:flex  justify-between w-full">
  
          <input type="text" placeholder="Phone Number" name="phoneNumber" className="border border-gray-400 p-2 "/>
          <input type="text" placeholder="Whatsapp Number" name="whatsappNumber" className="border border-gray-400 p-2 "/>
         </div>
  
         <div className="flex flex-col gap-5 md:flex  justify-between w-full">
  
          <input type="text" placeholder="Enter Logo" name="imageUrl" className="border border-gray-400 p-2 w-full"/>
          {/* <input type="text" placeholder="Store Image" name="productLink" className="border border-gray-400 p-2 w-full"/> */}
          <input type="hidden"  name="user" 
           value={user._id}
        //    
           />
         </div>
          
          
          <button className="border border-gray-400 rounded-md bg-black text-white p-2 w-full" type="submit">
            {isPending  ? "Loading...":"Submit"}
            </button>
        
       </div>
        </form>
        </div>

    )
}
export default AddLabForm