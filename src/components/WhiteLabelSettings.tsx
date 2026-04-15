import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useBranding } from '@/branding';

export function WhiteLabelSettings() {
  const { config, presets, patchConfig, patchTerminology, applyPreset, resetBranding } = useBranding();

  const updateAccent = (index: 0 | 1 | 2 | 3, color: string) => {
    const palette = [...config.accentPalette] as [string, string, string, string];
    palette[index] = color;
    patchConfig({ accentPalette: palette });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>White-label e Escola Adaptável</CardTitle>
          <CardDescription>
            Personalize marca, linguagem pedagógica e tipo de ensino. As mudanças são salvas automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Preset de Escola</Label>
              <Select
                value={config.presetId}
                onValueChange={(value) => applyPreset(value as typeof config.presetId)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um modelo" />
                </SelectTrigger>
                <SelectContent>
                  {presets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {presets.find((preset) => preset.id === config.presetId)?.description}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Marca</Label>
              <Input
                value={config.brandName}
                onChange={(event) => patchConfig({ brandName: event.target.value, presetId: 'custom' })}
                placeholder="Nome da escola"
              />
              <div className="flex items-center gap-2">
                <Input
                  value={config.logoEmoji}
                  onChange={(event) => patchConfig({ logoEmoji: event.target.value || '🎓', presetId: 'custom' })}
                  placeholder="🎓"
                  className="w-20"
                />
                <Badge variant="outline">Visual atual: {config.logoEmoji}</Badge>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Razão social / Organização</Label>
              <Input
                value={config.legalName}
                onChange={(event) => patchConfig({ legalName: event.target.value, presetId: 'custom' })}
              />
            </div>
            <div className="space-y-2">
              <Label>Área de ensino principal</Label>
              <Input
                value={config.subjectArea}
                onChange={(event) => patchConfig({ subjectArea: event.target.value, presetId: 'custom' })}
                placeholder="Ex: matemática, vendas, idiomas, música..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Slogan</Label>
            <Input
              value={config.tagline}
              onChange={(event) => patchConfig({ tagline: event.target.value, presetId: 'custom' })}
            />
          </div>

          <div className="space-y-2">
            <Label>Proposta de valor</Label>
            <Textarea
              value={config.valueProposition}
              onChange={(event) => patchConfig({ valueProposition: event.target.value, presetId: 'custom' })}
              rows={3}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome do tutor IA</Label>
              <Input
                value={config.aiTutorName}
                onChange={(event) => patchConfig({ aiTutorName: event.target.value, presetId: 'custom' })}
              />
            </div>
            <div className="space-y-2">
              <Label>Papel do tutor IA</Label>
              <Input
                value={config.aiTutorRoleDescription}
                onChange={(event) => patchConfig({ aiTutorRoleDescription: event.target.value, presetId: 'custom' })}
                placeholder="Ex: mentor pedagógico da escola"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vocabulário Pedagógico</CardTitle>
          <CardDescription>
            Defina os nomes que a plataforma usa para qualquer tipo de ensino.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Aprendiz (singular/plural)</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={config.terminology.learnerSingular}
                onChange={(event) => patchTerminology({ learnerSingular: event.target.value })}
              />
              <Input
                value={config.terminology.learnerPlural}
                onChange={(event) => patchTerminology({ learnerPlural: event.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Conteúdo principal (singular/plural)</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={config.terminology.lessonSingular}
                onChange={(event) => patchTerminology({ lessonSingular: event.target.value })}
              />
              <Input
                value={config.terminology.lessonPlural}
                onChange={(event) => patchTerminology({ lessonPlural: event.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Estrutura (singular/plural)</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={config.terminology.moduleSingular}
                onChange={(event) => patchTerminology({ moduleSingular: event.target.value })}
              />
              <Input
                value={config.terminology.modulePlural}
                onChange={(event) => patchTerminology({ modulePlural: event.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Prática (singular/plural)</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={config.terminology.missionSingular}
                onChange={(event) => patchTerminology({ missionSingular: event.target.value })}
              />
              <Input
                value={config.terminology.missionPlural}
                onChange={(event) => patchTerminology({ missionPlural: event.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Certificados e Cores</CardTitle>
          <CardDescription>
            Ajuste identidade visual e texto padrão de certificados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Programa padrão do certificado</Label>
              <Input
                value={config.certificateProgramFallback}
                onChange={(event) => patchConfig({ certificateProgramFallback: event.target.value, presetId: 'custom' })}
              />
            </div>
            <div className="space-y-2">
              <Label>Assinatura / Emissor</Label>
              <Input
                value={config.certificateIssuer}
                onChange={(event) => patchConfig({ certificateIssuer: event.target.value, presetId: 'custom' })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Paleta superior (4 faixas)</Label>
            <div className="flex items-center gap-3">
              {config.accentPalette.map((color, index) => (
                <label key={index} className="flex items-center gap-2 text-xs">
                  <input
                    type="color"
                    value={color}
                    onChange={(event) => updateAccent(index as 0 | 1 | 2 | 3, event.target.value)}
                    className="h-9 w-12 rounded border border-border bg-transparent cursor-pointer"
                  />
                  <span className="font-mono">{color}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <Button variant="outline" onClick={resetBranding}>
              Restaurar padrão da plataforma
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
