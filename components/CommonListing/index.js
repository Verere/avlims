"use client"

import { useRouter } from "next/navigation"
import ProductButton from "./ProductButton"
import ProductTile from "./ProductTile"
import { useContext, useEffect } from "react"
import { GlobalContext } from "@/context"




export default function CommonListing({data}){


    const router = useRouter()
    
    return(
        <section className="bg-white w-full">
                <div className="grid grid-cols-2 gap-2 px-2 ">
                    {
                    data && data.length ?
                    data.map(item =>(
                        <article className="relative flex flex-col border mb-2 cursor-pointer px-2 mt-2" key={item.id}>
                        <ProductTile item={item}/>
                        <ProductButton  item={item}/>
                    </article>
                    ))                  
                    
                    :''
                    }
                </div>
        </section>
    )}