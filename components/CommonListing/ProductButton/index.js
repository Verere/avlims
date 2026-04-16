"use client";

import { GlobalContext } from "@/context";
import { CartContext } from "@/context/CartContext";
import { addSales, } from "@/actions";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useFormState } from 'react-dom';
import { fetchLatestStockItem } from "@/actions/fetch";

export default function ProductButton({ item, orderRcpt}) {
  const pathname = usePathname();
  const router = useRouter();


  const [state, formAction, isPending] = useFormState(addSales, {});

  // useEffect(()=>{
  //   const getError = async()=>{

  //     if(state.success){
  //  console.log(true)
  //     }
  //     if(state.error){
  //     await  toast.warn(state.error)
  //     }
  //   }
  //   getError()
  // },[state])

 
  return (
  
    <>
        <div>
          <form action={formAction}>  
          <input type="hidden" name="hotelId" value={orderRcpt[0]?.slug} />
                    <input type="hidden" name="order" value={orderRcpt[0]?._id} />
                    <input type="hidden" name="orderNum" value={orderRcpt[0]?.orderNum} />
                    <input type="hidden" name="test" value={item.name} />
                    <input type="hidden" name="price" value={item.price}/>
                    <input type="hidden" name="user" value={orderRcpt[0]?.user} />
                    <input type="hidden" name="path" value={pathname} />
          <button
            style={{
              backgroundColor: "blue",
              color: "white",
              minWidth: "3rem",
              padding: ".5rem",
              border: "none",
              borderRadius: "10px",
              fontSize: "1rem",
            }}
          >
            Add 
          </button>
          </form>
        </div>            
    </>
  );
}
