"use client"
import React, { useEffect, useState, useContext } from 'react'
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { TabsContent } from "@radix-ui/react-tabs";
import Heading from '../Heading'
import PatientTable from '../PatientTable';
import TestTable from '../TestTable';
import { GlobalContext } from "@/context";
 import PrintPage from '../Print';
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Cart } from '../CartItem/Cart';
import ReferralTable from '../ReferralTable';
import ClinicTable from '../ClinicTable';
import { CartContext } from '@/context/CartContext';
import { updateOrderBillTo } from '@/actions';
import PaymentPage from '../Payment';
import { CartTotal } from '../CartItem/CartTotal';
 import {    Popover,    PopoverContent,    PopoverTrigger,  } from "@/components/ui/popover"
 
import moment from 'moment'


const RegPage=({slug, patients, tests, refLists, lab, orderRcpt, sales, pays, clinicList,})=>{
  const {order, setOrder} = useContext(CartContext)
 const {  user, setCPayment,total, payment, setPayment, setBal} = useContext(GlobalContext)
const [billTo, setBillTo]= useState("")
const pathname = usePathname();

  const { replace } = useRouter();

     var date = moment();
const bDate = date.format('D/MM/YYYY')
console.log(user,'uuser regpage')

    const [currentTab, setCurrentTab] = useState("patient");
useEffect(()=>{
  const setSlug=()=>{
    localStorage.setItem('slug', JSON.stringify(slug))

  }
  setSlug()
})  

useEffect(()=>{
  const getNewOrderToState=async()=>{
    await  setOrder(orderRcpt)
  }
  getNewOrderToState()
},[orderRcpt, setOrder])
	function handleTabChange(value) {
		setCurrentTab(value);
	  }

    useEffect(()=>{
  const getpayments=async()=>{
    let allPayments=[]
    allPayments =  pays.map((i) => i.amountPaid)  
       const paymentt = allPayments.reduce((acc, item) => 
       acc + (item)
       ,0)
       setPayment(paymentt)
       const t = total -payment
       setBal(t)
//  console.log("b",bal)
  }
  getpayments()
},[order ])
    return(
        <>
      <div className='min-h-screen -mt-[70px] overflow-y-hidden'>
    <Heading title="Register Test"/> 
   <div className='min-h-screen flex sm:flex-col w-full overflow-y-hidden'>
       <div className='min-y-screen overflow-y-hidden min-w-[50%] sm:w-full px-2'>
  <Tabs value={currentTab} onValueChange={handleTabChange}>
        <div className="w-full">
          <div className="flex items-center justify-between border-b pb-2">            
            <TabsList>
              <TabsTrigger value="patient">Search Patient</TabsTrigger>
              <TabsTrigger value="test">Test</TabsTrigger>
              <TabsTrigger value="clinic">Clinic</TabsTrigger>
              <TabsTrigger value="referral">Referral</TabsTrigger>
              <TabsTrigger value="bill">Bill To</TabsTrigger>
            </TabsList>
          </div>
        </div>
        <TabsContent value="patient">
          <>
		<PatientTable patients={patients}/>
   
</> 
     
      </TabsContent>
        <TabsContent value="test">
		<TestTable tests={tests} orderRcpt={orderRcpt} slug={slug}/>
        </TabsContent>
        <TabsContent value="clinic">
        <ClinicTable patients={clinicList} orderRcpt={orderRcpt}/>
        </TabsContent>
        <TabsContent value="referral">
        <ReferralTable patients={refLists} orderRcpt={orderRcpt}/>
        </TabsContent>
        <TabsContent value="bill">
		<div className='flex flex-col gap-2'>
      
      <input type="text" placeholder="Bill To" value ={billTo} onChanged={(e)=>setBillTo(e.target.value)} className="border mx-3 mr-10 mt-2 rounded-lg border-gray-400 p-2 w-full" required />
     
      <button onClick={async()=>await updateOrderBillTo(orderRcpt[0]?._id, billTo, pathname)}
      className='px-2 py-1 rounded-full bg-blue-800 text-white font-bold text-lg'>Save</button>
      {/* <button onClick={async()=>await updateOrderBillTo(orderRcpt[0]?._id, "Patient", pathname)}
      className='px-2 py-1 rounded-full bg-blue-800 text-white font-bold text-lg'>Patient</button>
      <button onClick={async()=>await updateOrderBillTo(orderRcpt[0]?._id, "Referral", pathname)}
      className='px-2 py-1 rounded-full bg-blue-800 text-white font-bold text-lg'>Referral</button>
      <button onClick={async()=>await updateOrderBillTo(orderRcpt[0]?._id, "Clinic", pathname)}
       className='px-2 py-1 rounded-full bg-blue-800 text-white font-bold text-lg'>Clinic</button> */}
    </div>
        </TabsContent>
        
      </Tabs>
	  </div>
      <div className='flex flex-col w-full h-screen'>
     <div className='p-1 h-[50%]'>
      <h3 className='font-bold text-lg text-center'>Registration Details</h3>
      <div className="flex flex-col font-bold space-y-2">
        <p>Patient Full Name : <span>{orderRcpt[0]?.name}</span> </p>
        <p>Phone Number :<span>{orderRcpt[0]?.phone}</span></p>
        <p>Address : <span>{orderRcpt[0]?.address}</span></p>
        <p>Clinic : <span>{orderRcpt[0]?.clinic}</span></p>
        <p>Referral : <span>{orderRcpt[0]?.referral}</span></p>
        <p>Bill To :<span>{orderRcpt[0]?.billTo}</span></p>
      
      </div>
      <div className='flex overflow-hidden'>
    <CartTotal cart={sales}/>
      </div>
      <div className='flex justify-between items-center px-2 mb-2'>
           <button className="p-4 w-full bg-gray-700 text-white font-bold">POST BILL</button>
                 <Popover>
          <PopoverTrigger>
      <a onClick={()=>setCPayment(0)}   className="p-1 px-2 mx-1 w-full  block bg-green-700 text-white font-bold rounded-bg">
      MAKE PAYMENT
                </a>
      

          </PopoverTrigger>
          <PopoverContent> 
          <PaymentPage slug={slug} orderRcpt={orderRcpt} cart={sales} lab={lab} pathname={pathname}/>
                    </PopoverContent>
        </Popover>
                
         <Popover>
          <PopoverTrigger>
          <a className='bg-black text-white p-1 px-2 mx-1 ml-2 font-bold rounded-bg block'>PRINT RECEIPT</a>


          </PopoverTrigger>
          <PopoverContent> 
          <PrintPage cart={sales} payment={payment} order={orderRcpt} lab={lab}/>
              </PopoverContent>
        </Popover>

         <button onClick={()=>setCPayment(0)}   className="p-4 w-full bg-gray-600 text-white font-bold rounded-bg">
      CANCEL TEST
                </button>
                {/* <button  className="p-2 w-full mt-2 bg-blue-500 text-white font-bold rounded-bg">
         New Registration
                </button> */}
      </div>
      </div>
     <div className='p-1 h-[40%] bg-blue-200 overflow-hidden'>
      <Cart cart={sales}/>
     </div>
   </div>

	  </div>
	  </div>
    </>
    )
}
export default RegPage