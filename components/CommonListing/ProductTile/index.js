"use client"
import { useRouter } from 'next/navigation';
import { currencyFormat } from './../../../utils/currency';


export default function ProductTile({item}){  
    const router = useRouter()
    return(
        <>
        {/* <div  className="overflow-hidden aspect-w-1 aspect-h-1 h-52">
           <picture>
            <img
            src={item?.image}
            alt={item.menu}
            className="h-full w-full object-cover transition-all duration-300 group-hover:scale-125"/>
            </picture>
        </div> */}
      
        <div  className="my-1  flex  justify-between">
        {/* onClick={()=>router.push(`/products/${item?._id}`)} */}
            <h3 className="text-black truncate text-sm font-bold">{item?.menu}</h3>
                <p className="text-xs font-semibold ">{currencyFormat(item.price)}</p>
            </div>
        </>

    )
}