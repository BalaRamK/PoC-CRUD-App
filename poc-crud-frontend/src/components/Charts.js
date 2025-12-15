import React from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export function BarChart({ data }) {
  const chartData = {
    labels: data.map(d => d.name),
    datasets: [
      {
        label: 'Value',
        data: data.map(d => d.value),
        backgroundColor: 'rgba(240, 102, 73, 0.6)',
      },
    ],
  };
  return <Bar data={chartData} />;
}

export function PieChart({ data }) {
  const chartData = {
    labels: data.map(d => d.name),
    datasets: [
      {
        data: data.map(d => d.value),
        backgroundColor: [
          'rgba(240, 102, 73, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
        ],
      },
    ],
  };
  return <Pie data={chartData} />;
}
