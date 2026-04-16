"use client"
import { usePathname, useRouter, useSearchParams } from "next/navigation";


const AddBtn =({styless, path, Name})=>{
    const { replace } = useRouter();
    const pathname = usePathname();
    return(
        <button onClick={()=>replace(`${pathname}/${path}`)} className={styless}>{Name}</button>
        
    )
}
export default AddBtn