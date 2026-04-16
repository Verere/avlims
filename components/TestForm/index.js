
"use client"
import { GlobalContext } from "@/context";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {useEffect, useContext, useState } from "react";
import { toast } from "react-toastify";
import { useFormState } from 'react-dom';
import { addTest } from '@/actions'
import { fetchCategory, fetchTestsById } from "@/actions/fetch";

 

const TestForm = ({slug, categories, order}) => {


  const { replace } = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const {user} = useContext(GlobalContext)
  // const user= JSON.parse(localStorage.getItem('user'))
  const [state, formAction, isPending] = useFormState(addTest, {});

  console.log('o', user)

const [values, setValues]=useState([])
const [loading, setLoading]=useState(false)
 const [category, setCategory]=useState([])
 const [name, setName] = useState('')
const [price, setPrice] = useState('')
 const [up, setUp] = useState(false)
const [code, setCode] = useState('')
const [id, setId] =useState('')

  
 useEffect(()=>{
  const getState=()=>{

if(state.error){
 toast.error(state.error)
 setLoading(false)
}
if(state.success){
toast.success(state.success)
 setLoading(false)
 setUp(false)
 setName('')
 setPrice('')
 setUp(false)
 setId('')
  replace(`/dashboard/${slug}/tests`)
}
}
getState()
 },[state])

 useEffect(()=>{
  const getProd = async ()=>{
    const params = new URLSearchParams(searchParams)
    const id = params.get('id')
      // setTotal(prod[0]?.totalValue)

     if(id){
      const prod = await fetchTestsById(id)
      console.log('pt',prod)
      setName(prod[0]?.name)
      setPrice(prod[0]?.price)
      setUp(true)
      setId(id)
      if(prod[0]?.category)setCategory(prod[0]?.category)
     }
}
getProd()
},[searchParams])

  return (
    <>

      <form action={formAction} className="flex flex-col justify-between  w-full">
        <div className='flex justify-between items-center sm:flex-col'>
      <input type="text" placeholder="Enter Test Name" value={name} name="name" onChange={async (e)=>await setName(e.target.value)} className="border mx-2 sm:mb-2 border-gray-400 p-2 w-full" required />
      <input type="number" placeholder="Enter Price" value={price} name="price" onChange={async (e)=>await setPrice(e.target.value)} className="border mx-2 border-gray-400 p-2 w-full" />
 <input name="up" type="hidden" value={up} />
 <input name="id" type="hidden" value={id} />
    {/* <select name="group"   value={values} onChange={(e)=>findCategory(e.target.value)}>
          <option value="">Choose Group</option>
            {
              groups?.map(menu=>(
                <option key={menu._id} id={menu.name} value={menu.name} >{menu.name}</option>
              ))
            }
        </select> */}
        <select name="category" id="cat" className='p-2 w-full'  value={category} onChange={(e)=>setCategory(e.target.value)}>
          <option value="">Choose Category</option>
            {
              categories?.map(menu=>(
                <option key={menu._id} id={menu.name} value={menu.name} >{menu.name}</option>
              ))
            }
        </select> 
                   
       <input type="hidden"  name="order" value={order?._id} /> 
       <input type="hidden"  name="user" value={user?.name} /> 
       <input type="hidden"  name="slug" value={slug} /> 
      <input type="hidden"  name="path" value={pathname} />
          
      <button onClick={()=>setLoading(true)}  className="border border-gray-400 rounded-md bg-black text-white mx-2 p-2 w-full"> {loading? 'loading...' : id ? 'UPDATE TEST': 'Add New Test'}</button>
      </div>
    
      </form>
    </>
  );
};

export default TestForm;

