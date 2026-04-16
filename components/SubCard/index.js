import React from 'react'

export default function Card({subs}) {
  if(!subs){
      return (

        <div> no Card</div>
      )
    }else{
      return(
        <>

          {
            subs.map(sub =>(
              <>
              <div className='border border-gray-700 rounded-lg mb-4 flex flex-col justify-center items-center gap-3 '>
                <h4>{sub.name}</h4>
                <span>{sub?.maxStore}</span>
              </div>
            </>
          ))
        }
        </>
      )
    }
}
