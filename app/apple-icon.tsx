import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:36,background:"radial-gradient(circle at 35% 25%, #172c46, #050912)",position:"relative"}}>
      <div style={{position:"absolute",width:132,height:132,border:"3px solid rgba(117,220,255,.32)",borderRadius:100}} />
      <div style={{fontSize:112,fontWeight:800,color:"#e7f6ff",lineHeight:1,textShadow:"0 0 18px #59cfff"}}>J</div>
      <div style={{position:"absolute",width:146,height:56,border:"7px solid #7a9cff",borderLeftColor:"#b16cff",borderRightColor:"#5bdfff",borderRadius:"50%",transform:"rotate(-28deg)"}} />
    </div>,
    size
  );
}
