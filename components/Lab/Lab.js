"use client"
import Link from 'next/link'
import React from 'react'

export const LabComponent = ({labs}) => {
    if(!labs) return <p>no lab found</p> 
  return (
    <div>
      <h3>Labs</h3>
        {labs.map((lab)=>(
          <>
          <div className='flex flex-col'>
            <button key={lab?._id}>
              <Link href={`/Lab/${lab.slug}`}>
              {lab.name}
              </Link>
              </button>
            </div>
            </>
            ))
            }
    </div>
  )
}
