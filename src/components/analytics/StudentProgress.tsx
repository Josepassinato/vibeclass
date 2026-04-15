import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StudentRow {
  id: string;
  name: string | null;
  totalStudyMinutes: number;
  lastSeen: string | null;
  avgQuizScore: number;
  lessonsCompleted: number;
}

interface StudentProgressProps {
  students: StudentRow[];
}

export function StudentProgressTable({ students }: StudentProgressProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Progresso dos Alunos</CardTitle>
      </CardHeader>
      <CardContent>
        {students.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum aluno registrado</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-medium">Aluno</th>
                  <th className="text-right py-2 px-2 font-medium">Tempo</th>
                  <th className="text-right py-2 px-2 font-medium">Aulas</th>
                  <th className="text-right py-2 px-2 font-medium">Media Quiz</th>
                  <th className="text-right py-2 px-2 font-medium">Ultimo acesso</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-2 px-2">{s.name || 'Anonimo'}</td>
                    <td className="py-2 px-2 text-right text-muted-foreground">
                      {Math.round(s.totalStudyMinutes)}min
                    </td>
                    <td className="py-2 px-2 text-right">
                      <Badge variant="secondary" className="text-xs">{s.lessonsCompleted}</Badge>
                    </td>
                    <td className="py-2 px-2 text-right">
                      <span className={s.avgQuizScore >= 70 ? 'text-green-600' : 'text-orange-500'}>
                        {Math.round(s.avgQuizScore)}%
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right text-muted-foreground text-xs">
                      {s.lastSeen ? new Date(s.lastSeen).toLocaleDateString('pt-BR') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
