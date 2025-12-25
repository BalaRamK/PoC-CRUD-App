import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
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

export function BarChart({ data, title = 'Bar Chart' }) {
  const chartData = {
    labels: data.map(d => d.name),
    datasets: [
      {
        label: 'Value',
        data: data.map(d => d.value),
        backgroundColor: 'rgba(240, 102, 73, 0.7)',
      },
    ],
  };
  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Bar data={chartData} />
      </CardContent>
    </Card>
  );
}

export function PieChart({ data, title = 'Pie Chart' }) {
  const chartData = {
    labels: data.map(d => d.name),
    datasets: [
      {
        data: data.map(d => d.value),
        backgroundColor: [
          'rgba(240, 102, 73, 0.7)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
        ],
      },
    ],
  };
  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Pie data={chartData} />
      </CardContent>
    </Card>
  );
}
