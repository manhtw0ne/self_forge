const features={
 WEEKLY:{vi:'gợi ý AI',en:'AI suggestions'},
 GOAL:{vi:'kế hoạch AI',en:'AI plans'},
 RESTART:{vi:'bản nháp AI',en:'AI drafts'},
 JOURNAL:{vi:'phản hồi AI',en:'AI reflections'},
 DAILY_FOCUS:{vi:'gợi ý ưu tiên AI',en:'AI priority suggestions'},
 CHAT:{vi:'phiên hỏi đáp AI',en:'AI habit Q&A sessions'}
};

export function aiQuotaNotice(status,feature,language='vi'){
 if(!status||!Number.isInteger(status.limit)||status.limit<0||status.limit>100||!Number.isInteger(status.remaining)||status.remaining<0||status.remaining>status.limit||!Object.hasOwn(features,feature)||!['vi','en'].includes(language))throw Error('Invalid AI quota notice');
 const en=language==='en',label=features[feature][en?'en':'vi'];
 if(status.limit===0)return {level:'limit',message:en?`AI ${label.toLowerCase()} are not enabled for this account.`:`Tài khoản này hiện chưa được cấp lượt ${label}.`};
 if(status.remaining===0)return {level:'limit',message:en?`You have used all ${label.toLowerCase()} for this month.`:`Bạn đã dùng hết lượt ${label} trong tháng này.`};
 const used=status.limit-status.remaining,percent=used*100/status.limit;
 if(percent>=80)return {level:'warning',message:en?`You have used ${used}/${status.limit} ${label.toLowerCase()} this month.`:`Bạn đã dùng ${used}/${status.limit} lượt ${label} trong tháng này.`};
 if(percent>=50)return {level:'info',message:en?`You have used half of this month’s ${label.toLowerCase()}.`:`Bạn đã dùng một nửa lượt ${label} trong tháng này.`};
 return null;
}
