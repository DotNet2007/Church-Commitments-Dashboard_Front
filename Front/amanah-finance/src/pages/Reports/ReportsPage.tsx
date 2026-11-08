// import { ChartNoAxesCombined } from "lucide-react";

// export default function ReportsPage() {
//   return (
//     <div className="space-y-6" dir="rtl">
//       <div>
//         <span className="text-sm text-purple-400">
//           التحليلات والمؤشرات
//         </span>

//         <h1 className="text-2xl font-bold text-[#594e65]">
//           التقارير المالية
//         </h1>

//         <p className="mt-1 text-sm text-gray-400">
//           نظرة تفصيلية على أداء التحصيل والالتزامات المالية.
//         </p>
//       </div>

//       <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
//         {[
//           { label: "إجمالي المستحقات", value: "184,500 ر.س" },
//           { label: "إجمالي المحصل", value: "142,800 ر.س" },
//           { label: "المبالغ المتبقية", value: "41,700 ر.س" },
//         ].map((item) => (
//           <div
//             key={item.label}
//             className="rounded-xl border border-[#e8e0f0] bg-white p-5"
//           >
//             <p className="text-sm text-gray-400">{item.label}</p>
//             <h2 className="mt-3 text-xl font-bold text-[#655675]">
//               {item.value}
//             </h2>
//           </div>
//         ))}
//       </div>

//       <div className="rounded-xl border border-[#e8e0f0] bg-white p-10 text-center">
//         <ChartNoAxesCombined
//           size={36}
//           className="mx-auto text-[#9b82c4]"
//         />

//         <h2 className="mt-4 font-bold text-[#594e65]">
//           تحليل الأداء المالي
//         </h2>

//         <p className="mt-2 text-sm text-gray-400">
//           سيتم إضافة التقارير التفصيلية في المرحلة التالية.
//         </p>
//       </div>
//     </div>
//   );
// }