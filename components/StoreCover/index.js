import Link from "next/link"

const StoreCover = ({menus, store, params}) => {  
    return (
        <div className="min-h-screen flex flex-col justify-center items-center">
  
    <div className="flex bg-white w-full justify-center rounded-r-full items-center p-4">
        <picture className="ml-4 overflow-hidden rounded-full  bg-blue-500">
    <img src={'/logo.png'} alt ='' className='h-[100px] w-[100px] rounded-full items-center'/>               
     </picture>          
    <div className="ml-4 font-bold tracking-light text-xl shadow-sm text-center">{store.name}</div>
    </div>
    <div className="mt-4 flex flex-wrap flex-shrink-0 gap-4 items-center justify-center mx-auto p-7">
        {menus.map(menu=>
            <Link href={`/${params}/menu/${menu.name}`} key={menu._id}>
                <div className="mx-auto border shadow-lg p-5 w-11/12">

                <p className='border mb-2 rounded-sm font-bold text-xl'>{menu.name}</p>
                </div>
            </Link>
        )}
    </div>
        </div>
    )
}

export default  StoreCover
