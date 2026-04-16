import Link from "next/link"

const MainNav=()=>{
    return(
        <div className="flex w-full h-16 shadow-md justify-around items-center z-50 bg-black py-8">
            <div className="font-bold" >
                
                <span className="text-yellow-700 text-2xl">Averit</span>
                <span className="text-xl text-white">LIMS</span>
                </div>
            <div>
            <div className="space-x-3 sm:space-x-0 text-white">
                    {/* <Link href="/signup"><button className="py-2 px-3 focus:outline-none">register</button></Link> */}
                    <Link href="/login"><button className="py-2 px-3 focus:outline-none">Login</button></Link>
                                
                </div>



            </div>
        </div>
    )
}
export default MainNav