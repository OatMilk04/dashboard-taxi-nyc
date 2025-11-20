import { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  AreaChart, Area, BarChart, Bar, ComposedChart, Line, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend 
} from 'recharts';
import { Car, DollarSign, Activity, Filter, TrendingUp, MapPin, Clock, Calendar, Zap, Trophy, Loader2, AlertTriangle, ArrowRight } from 'lucide-react';
import TaxiMap from './components/TaxiMap'; 
import InsightsPanel from './components/InsightsPanel';

function App() {
  const [kpis, setKpis] = useState(null);
  const [hourlyData, setHourlyData] = useState([]);
  const [zoneData, setZoneData] = useState({});
  const [histData, setHistData] = useState([]);
  const [peakData, setPeakData] = useState([]);
  const [topZones, setTopZones] = useState([]); 
  const [alertData, setAlertData] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [route, setRoute] = useState({ from: '', to: '' });
  
  const [dayFilter, setDayFilter] = useState("all"); 
  const [timeFilter, setTimeFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = { day: dayFilter === "all" ? undefined : dayFilter, time: timeFilter === "all" ? undefined : timeFilter, month: monthFilter === "all" ? undefined : monthFilter };
        const [kpiRes, chartRes, mapRes, histRes, peakRes, topRes, alertRes] = await Promise.all([
          axios.get('http://localhost:3001/api/kpis', { params }),
          axios.get('http://localhost:3001/api/hourly', { params }),
          axios.get('http://localhost:3001/api/zones', { params }),
          axios.get('http://localhost:3001/api/histogram', { params }),
          axios.get('http://localhost:3001/api/peak-valley', { params }),
          axios.get('http://localhost:3001/api/top-zones', { params }),
          axios.get('http://localhost:3001/api/alert', { params })
        ]);
        setKpis(kpiRes.data); setHourlyData(chartRes.data); setZoneData(mapRes.data);
        setHistData(histRes.data); setPeakData(peakRes.data); setTopZones(topRes.data); setAlertData(alertRes.data);
      } catch (error) { console.error("Error:", error); }
    };
    fetchData();
  }, [dayFilter, timeFilter, monthFilter]);

  const handlePredict = async () => {
    if(!route.from || !route.to) return;
    try {
      setPrediction(null);
      const res = await axios.get('http://localhost:3001/api/predict', { params: { from: route.from, to: route.to } });
      setPrediction(res.data);
    } catch (e) { console.error(e); }
  };

  const formatAlert = (data) => {
    if (!data) return "Calculando...";
    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const dayName = days[parseInt(data.day_num)];
    const hour = parseInt(data.hour_num);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${dayName}, ${hour} ${ampm}`;
  };

  const resetFilters = () => { setDayFilter("all"); setTimeFilter("all"); setMonthFilter("all"); };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 backdrop-blur border border-slate-600 p-3 rounded-xl shadow-2xl text-white text-xs z-50">
          <p className="font-bold mb-2 text-indigo-300 uppercase tracking-wider">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-3 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
              <div className="flex justify-between w-full gap-4">
                <span className="text-slate-400">{entry.name}:</span>
                <span className="font-mono font-bold text-white">
                   {/* Formateo inteligente */}
                   {entry.name.includes('Costo') ? '$' : ''}
                   {Number(entry.value).toLocaleString()}
                   {entry.name.includes('Dist') ? ' mi' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!kpis) return <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white"><Loader2 size={64} className="text-indigo-400 animate-spin mb-4" /><p className="text-xl font-bold">Cargando Dashboard Táctico...</p></div>;

  return (
    <div className="min-h-screen bg-[#0f172a] p-4 md:p-8 font-sans text-slate-300">
      
      {/* HEADER */}
      <header className="flex flex-col xl:flex-row justify-between items-center mb-10 bg-slate-800/50 backdrop-blur-lg p-6 rounded-3xl border border-slate-700 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
        <div className="relative z-10 mb-6 xl:mb-0 text-center xl:text-left">
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">MOVILIDAD <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">NYC</span></h1>
          <p className="text-slate-400">Plataforma Táctica de Análisis de Tráfico & Rentabilidad</p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-3 bg-slate-900/80 p-2 rounded-2xl border border-slate-700 shadow-inner">
            {/* FILTRO COMPLETO DE MESES */}
            <FilterSelect icon={Calendar} value={monthFilter} onChange={setMonthFilter} options={[
                {val:"all", txt:"📅 Todo el Año"},
                {val:"1", txt:"Enero"}, {val:"2", txt:"Febrero"}, {val:"3", txt:"Marzo"},
                {val:"4", txt:"Abril"}, {val:"5", txt:"Mayo"}, {val:"6", txt:"Junio"},
                {val:"7", txt:"Julio"}, {val:"8", txt:"Agosto"}, {val:"9", txt:"Septiembre"},
                {val:"10", txt:"Octubre"}, {val:"11", txt:"Noviembre"}, {val:"12", txt:"Diciembre"}
            ]} />
            
            <FilterSelect icon={Filter} value={dayFilter} onChange={setDayFilter} options={[
                {val:"all", txt:"Todos Días"},{val:"weekday", txt:"Laboral (L-V)"},{val:"weekend", txt:"Finde (S-D)"},
                {val:"1", txt:"Lunes"},{val:"2", txt:"Martes"},{val:"3", txt:"Miércoles"},{val:"4", txt:"Jueves"},{val:"5", txt:"Viernes"},{val:"6", txt:"Sábado"},{val:"0", txt:"Domingo"}
            ]} />
            
            <FilterSelect icon={Clock} value={timeFilter} onChange={setTimeFilter} options={[
                {val:"all", txt:"24 Horas"},{val:"morning", txt:"Mañana"},{val:"afternoon", txt:"Tarde"},{val:"night", txt:"Noche"}
            ]} />
            
            <button onClick={resetFilters} className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition">↺</button>
        </div>
      </header>

      {/* ALERTA */}
      {alertData && (
        <div className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-1">
          <div className="bg-slate-900/80 backdrop-blur-sm p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-full animate-pulse"><AlertTriangle size={24}/></div>
              <div><p className="text-xs font-bold text-amber-500 uppercase tracking-widest">Pico de Demanda</p><p className="text-xl font-bold text-white">{formatAlert(alertData)} <span className="text-slate-500 text-sm font-normal">({Number(alertData.total_trips).toLocaleString()} viajes)</span></p></div>
            </div>
          </div>
        </div>
      )}

      {/* KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <KpiCard title="Tarifa Prom." value={`$${Number(kpis.avg_price).toFixed(2)}`} icon={DollarSign} color="text-emerald-400" from="from-emerald-500/20" to="to-emerald-900/5" />
        <KpiCard title="Distancia" value={`${Number(kpis.avg_distance).toFixed(1)} mi`} icon={Car} color="text-blue-400" from="from-blue-500/20" to="to-blue-900/5" />
        <KpiCard title="Velocidad" value={`${Number(kpis.avg_speed).toFixed(1)} mph`} icon={Zap} color="text-yellow-400" from="from-yellow-500/20" to="to-yellow-900/5" />
        <KpiCard title="Viajes" value={(kpis.total_trips / 1000).toFixed(1) + 'k'} icon={Activity} color="text-purple-400" from="from-purple-500/20" to="to-purple-900/5" />
        <KpiCard title="Propina" value={`$${Number(kpis.avg_tip).toFixed(2)}`} icon={TrendingUp} color="text-orange-400" from="from-orange-500/20" to="to-orange-900/5" />
        <KpiCard title="Rentabilidad" value={`$${Number(kpis.price_per_mile).toFixed(2)}/mi`} icon={MapPin} color="text-pink-400" from="from-pink-500/20" to="to-pink-900/5" />
      </div>

      {/* ZONA PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        <div className="lg:col-span-3 flex flex-col gap-6">
          <InsightsPanel kpis={kpis} hourlyData={hourlyData} />
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg">
            <h3 className="text-white font-bold flex items-center gap-2 mb-4"><Zap className="text-yellow-400"/> Cotizador</h3>
            <div className="space-y-3">
              <input type="number" placeholder="Origen (ID)" className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-xl" onChange={e => setRoute({...route, from: e.target.value})}/>
              <input type="number" placeholder="Destino (ID)" className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-xl" onChange={e => setRoute({...route, to: e.target.value})}/>
              <button onClick={handlePredict} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-2">Calcular <ArrowRight size={16}/></button>
            </div>
            {prediction && !prediction.error && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                 <div className="flex justify-between text-sm mb-1"><span className="text-slate-400">Estimado:</span> <span className="text-green-400 font-mono font-bold text-lg">${Number(prediction.predicted_price).toFixed(2)}</span></div>
                 <div className="mt-2 text-[10px] text-center text-slate-500 bg-slate-900 py-1 rounded">{prediction.type}</div>
              </div>
            )}
          </div>
          <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
             <h3 className="text-slate-300 font-bold flex items-center gap-2 mb-4"><Trophy className="text-yellow-500" size={18}/> Top Zonas</h3>
             <div className="space-y-2">{topZones.map((z, i) => (<div key={i} className="flex justify-between items-center p-2 hover:bg-slate-700/50 rounded-lg cursor-default"><span className="text-sm font-medium text-slate-200">#{i+1} Zona {z.zone_id}</span><span className="text-xs font-bold text-indigo-400">{Number(z.count).toLocaleString()}</span></div>))}</div>
          </div>
        </div>
        <div className="lg:col-span-9 bg-slate-800 rounded-3xl border border-slate-700 p-1 shadow-2xl relative h-[650px] overflow-hidden">
           <div className="absolute top-5 left-5 z-[1000] bg-slate-900/90 backdrop-blur px-4 py-2 rounded-full border border-slate-600 shadow-xl"><h3 className="text-white font-bold flex items-center gap-2"><MapPin size={16} className="text-red-400"/> Heatmap</h3></div>
           <TaxiMap zoneData={zoneData} />
        </div>
      </div>

      {/* GRÁFICOS INFERIORES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartContainer title="Tendencia Horaria" subtitle="Volumen de viajes por hora">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourlyData}>
              <defs><linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="hour" tick={{fill:'#94a3b8', fontSize:10}} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} fill="url(#colorVol)" name="Viajes" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Distribución de Precios" subtitle="Frecuencia por rango de tarifa">
           <ResponsiveContainer width="100%" height="100%">
             <BarChart data={histData}>
               <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
               <XAxis dataKey="range" tick={{fill:'#94a3b8', fontSize:10}} axisLine={false} tickLine={false} />
               <Tooltip content={<CustomTooltip />} />
               <Bar dataKey="count" name="Frecuencia" radius={[4, 4, 0, 0]}>{histData.map((entry, index) => (<Cell key={`cell-${index}`} fill={index < 3 ? '#10b981' : index < 6 ? '#f59e0b' : '#ef4444'} />))}</Bar>
             </BarChart>
           </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Impacto Financiero" subtitle="Costo Ponderado vs Distancia">
           <ResponsiveContainer width="100%" height="100%">
             <ComposedChart data={peakData} layout="vertical" margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
               <CartesianGrid stroke="#334155" strokeDasharray="3 3" horizontal={true} vertical={false}/>
               <XAxis type="number" hide />
               <YAxis dataKey="period" type="category" scale="band" tick={{fill:'#cbd5e1', fontWeight:'bold', fontSize:12}} axisLine={false} tickLine={false} width={80}/>
               <Tooltip content={<CustomTooltip />} />
               <Legend wrapperStyle={{paddingTop: '10px', fontSize: '12px', color: '#94a3b8'}} iconType="circle"/>
               
               {/* USA LA VARIABLE PONDERADA 'weighted_price_per_mile' */}
               <Bar dataKey="weighted_price_per_mile" name="Costo ($/mi)" barSize={20} radius={[0, 4, 4, 0]} fill="#10b981">
                 {peakData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.period.includes('Pico') ? '#f43f5e' : '#10b981'} />))}
               </Bar>
               
               <Line dataKey="avg_distance" name="Dist. (mi)" type="monotone" stroke="#facc15" strokeWidth={3} dot={{r: 5, fill:'#facc15', strokeWidth:2, stroke:'#0f172a'}} />
             </ComposedChart>
           </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  );
}

function FilterSelect({ icon: Icon, value, onChange, options }) {
  return (
    <div className="relative group">
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none"><Icon size={16} className="text-indigo-400" /></div>
      <select className="appearance-none bg-slate-800 text-white text-sm font-bold py-3 pl-10 pr-8 rounded-xl border border-slate-600 hover:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer min-w-[140px]" value={value} onChange={(e) => onChange(e.target.value)}>{options.map(o => <option key={o.val} value={o.val}>{o.txt}</option>)}</select>
    </div>
  );
}
function KpiCard({ title, value, icon: Icon, color, from, to }) { return (<div className={`bg-slate-800 rounded-2xl p-5 border border-slate-700 shadow-lg relative overflow-hidden group hover:-translate-y-1 transition-all duration-300`}><div className={`absolute inset-0 bg-gradient-to-br ${from} ${to} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div><div className="relative z-10 flex items-start justify-between"><div><p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">{title}</p><p className="text-2xl font-black text-white tracking-tight">{value}</p></div><div className={`p-3 rounded-xl bg-slate-900/50 ${color} shadow-inner`}><Icon size={20} /></div></div></div>); }
function ChartContainer({ title, subtitle, children }) { return (<div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl flex flex-col h-80 hover:border-slate-600 transition-colors"><div className="mb-4"><h3 className="text-white font-bold text-lg">{title}</h3><p className="text-slate-400 text-xs">{subtitle}</p></div><div className="flex-1 min-h-0">{children}</div></div>); }

export default App;
