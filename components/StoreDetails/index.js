"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";


export default function CommonDetails({ item }) {
  const searchParams = useSearchParams();
  const { replace } = useRouter();
  const pathname = usePathname();
 



  return (
    <>
    <div className='min-h-screen flex flex-col w-full'>
    <section className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
      <div className=" mx-auto px-2 ">
          <div className="lg:col-span-2 lg:row-end-1" >
            <div className="lg:flex lg:items-start lg:mr-3 ">
             <picture>

                    <img
                      src={item?.image}
                      className="h-[50px] w-[50px] max-w-full overflow-hidden rounded-full object-cover"
                      alt="Product Details"
                    
                      />
                      </picture>
                  </div>
             
              </div>
              <div className="mt-2 lg:mt-0 w-full  ">
                <h1> {item?.name} </h1>
                <p>{item.address}</p>
              </div>
            </div>
    </section>
    <div className="flex flex-col p-4">
<button className='bg-black text-white rounded mb-3 py-2 px-3' onClick={()=>replace(`${pathname}/menu`)}>Menu</button>
<button className='bg-black text-white rounded mb-3 py-2 px-3' onClick={()=>replace(`${pathname}/category`)}>Category</button>
<button className='bg-black text-white rounded mb-3 py-2 px-3' onClick={()=>replace(`${pathname}/products`)}>Products</button>
    </div>
            </div>

    </>

  );
}
