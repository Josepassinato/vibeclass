import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface QuizPerformanceProps {
  passRate: number;
  avgScore: number;
  totalAttempts: number;
}

const COLORS = ['hsl(142, 76%, 36%)', 'hsl(0, 84%, 60%)'];

export function QuizPerformance({ passRate, avgScore, totalAttempts }: QuizPerformanceProps) {
  const data = [
    { name: 'Aprovados', value: Math.round(passRate) },
    { name: 'Reprovados', value: Math.round(100 - passRate) },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Desempenho nos Quizzes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{Math.round(avgScore)}%</p>
            <p className="text-xs text-muted-foreground">Media de acertos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{totalAttempts}</p>
            <p className="text-xs text-muted-foreground">Total de tentativas</p>
          </div>
        </div>
        {totalAttempts > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value}%`]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">Sem tentativas ainda</p>
        )}
      </CardContent>
    </Card>
  );
}
