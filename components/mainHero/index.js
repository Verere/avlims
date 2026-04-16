
'use client';
import Slider from "react-slick";

const imageLists=[
    {
        id:0,
        img:"/QRCode.jpg",
        title:"Display Pictures of your Menu",
        description: "Lorem is a very good tools to be using ofor didk"
    },
    {
        id:1,
        img:"/logo.png",
        title:"Increase Sales by 70%",
        description: "Lorem is a very good tools to be using ofor didk"
    },
    {
        id:2,
        img:"/QRCodes.jpg",
        title:"Edit Prices with ease",
        description: "Lorem is a very good tools to be using ofor didk"
    },
]
const Hero =()=>{

    var settings={
        dots:false,
        arrows:false,
        infinite:true,
        speed:800,
        slidesToShow: 1,
        slidesToScroll: 1,
        autoplay:true,
        autoplaySpeed:4000,
        cssEase:"ease-in-out",
        pauseOnHover:false,
        pauseOnFocus:true,
    }
   
    return(
        <>
         <div className="pt-[120px]">
        <div className="relative overflow-hidden min-h-[350px] sm:min-h-[550px] flex justify-center items-center duration-200">
           <div className="rotate-45 absolute  rounded-3xl -top-1/2 w-[400px] right-30 bg-yellow-800/40 -z-10 ">
            <picture><img src="/qr.png" alt="photo" className="w-[400px] h-[400px]"/></picture> 
           </div>
           <div className="container absolute left-0 top-0">
            <Slider {...settings}>
                {imageLists.map(item => (
                    <>
                    <div key={item.id} className="grid grid-cols-2 sm:grid-cols-1 overflow-hidden">
            <div className="flex flex-col justify-center gap-3 text-center  order-2 sm:order-1 relative  z-10 sm:px-auto">
                    <h1 className="font-bold text-4xl sm:text-3xl lg:text-6xl capitalize ">{item.title}</h1>
                    <p className="text-2xl px-3">{item.description}</p>
                    <div>
                    <button className="btn hover:scale-105 duration-200 mt-1">
                        try now
                    </button>
                    </div>
            </div>
            <div className="">
            <div className="relative overflow-hidden py-4 z-10" >
                <picture>
                    <img src={item.img} alt="hero" className="w-[300px] max-h-[300px]  object-contain mx-auto"/>
                </picture>
            </div>
            </div>
            </div>
            </>
                ))}
           
            </Slider>
           </div>
            </div>
            </div>
            </>
    )
}
export default Hero