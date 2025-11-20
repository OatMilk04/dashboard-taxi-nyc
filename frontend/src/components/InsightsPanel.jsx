import React from 'react';
import { AlertCircle, CheckCircle, Zap, TrendingUp } from 'lucide-react';

const InsightsPanel = ({ kpis, hourlyData }) => {
  if (!kpis) return null;

  const isCongested = parseFloat(kpis.avg_speed) < 12;
  const peakHourObj = hourlyData.reduce((max, current) => 
    (parseInt(current.count) > parseInt(max.count) ? current : max), { count: 0, hour: 0 });

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-lg overflow-hidden mb-6">
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 p-4 border-b border-slate-700">
        {/* CAMBIO: NOMBRE SIN IA */}
        <h3 className="text-white font-bold flex items-center gap-2">
          <Zap size={18} className="text-yellow-400" />
          Análisis de Métricas
        </h3>
      </div>

      <div className="p-4 space-y-3">
        <div className={`p-3 rounded-xl border-l-4 ${isCongested ? 'bg-red-900/20 border-red-500' : 'bg-emerald-900/20 border-emerald-500'}`}>
          <div className="flex items-start gap-3">
            {isCongested ? <AlertCircle className="text-red-400 mt-0.5" size={16}/> : <CheckCircle className="text-emerald-400 mt-0.5" size={16}/>}
            <div>
              <p className="text-sm font-bold text-slate-200">
                {isCongested ? "Congestión Recurrente" : "Fluidez Óptima"}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Velocidad: <strong className="text-slate-300">{Number(kpis.avg_speed).toFixed(1)} mph</strong>.
              </p>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl border-l-4 bg-blue-900/20 border-blue-500">
          <div className="flex items-start gap-3">
            <TrendingUp className="text-blue-400 mt-0.5" size={16}/>
            <div>
              <p className="text-sm font-bold text-slate-200">Pico de Demanda</p>
              <p className="text-xs text-slate-400 mt-1">
                Hora crítica: <strong className="text-slate-300">{peakHourObj.hour}:00 hrs</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsightsPanel;
