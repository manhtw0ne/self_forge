import {useEffect,useState} from 'react';
import {companionArt} from '../utils/companionArt';

// Artwork is optional presentation, never a reason to hide real progress.
export default function CompanionImage({species,stage,alt,width,height,style,...props}){
 const [failed,setFailed]=useState(false);const source=companionArt[species]?.[stage-1];
 useEffect(()=>setFailed(false),[source]);
 if(failed||!source)return <span {...(alt?{role:'img','aria-label':alt}:{'aria-hidden':true})} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width,height,textAlign:'center',overflowWrap:'anywhere',...style}}>{alt}</span>;
 return <img {...props} src={source} alt={alt} width={width} height={height} style={style} onError={()=>setFailed(true)}/>;
}
