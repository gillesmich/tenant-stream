import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  company: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  postal_code: string | null
  country: string | null
}

export default function OwnerProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user])

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single()

      if (error) {
        console.error('Error loading profile:', error)
        toast.error('Erreur lors du chargement du profil')
      } else {
        setProfile(data)
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Erreur lors du chargement du profil')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || !user) return

    setSaving(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          phone: profile.phone,
          company: profile.company,
          address_line1: profile.address_line1,
          address_line2: profile.address_line2,
          city: profile.city,
          postal_code: profile.postal_code,
          country: profile.country,
        })
        .eq('user_id', user.id)

      if (error) {
        console.error('Error updating profile:', error)
        toast.error('Erreur lors de la sauvegarde')
      } else {
        toast.success('Profil mis à jour avec succès')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const updateProfile = (field: keyof Profile, value: string) => {
    if (profile) {
      setProfile({ ...profile, [field]: value })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement du profil...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-destructive">Erreur lors du chargement du profil</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Profil du Bailleur</CardTitle>
          <CardDescription>
            Modifiez vos informations personnelles. Ces données seront utilisées lors de la génération des quittances de loyer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informations personnelles */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Informations personnelles</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Prénom</Label>
                  <Input
                    id="first_name"
                    value={profile.first_name || ''}
                    onChange={(e) => updateProfile('first_name', e.target.value)}
                    placeholder="Votre prénom"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="last_name">Nom</Label>
                  <Input
                    id="last_name"
                    value={profile.last_name || ''}
                    onChange={(e) => updateProfile('last_name', e.target.value)}
                    placeholder="Votre nom"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Société (optionnel)</Label>
                <Input
                  id="company"
                  value={profile.company || ''}
                  onChange={(e) => updateProfile('company', e.target.value)}
                  placeholder="Nom de votre société"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email || ''}
                    onChange={(e) => updateProfile('email', e.target.value)}
                    placeholder="votre.email@exemple.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={profile.phone || ''}
                    onChange={(e) => updateProfile('phone', e.target.value)}
                    placeholder="06 12 34 56 78"
                  />
                </div>
              </div>
            </div>

            {/* Adresse */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Adresse du bailleur</h3>
              
              <div className="space-y-2">
                <Label htmlFor="address_line1">Adresse ligne 1</Label>
                <Input
                  id="address_line1"
                  value={profile.address_line1 || ''}
                  onChange={(e) => updateProfile('address_line1', e.target.value)}
                  placeholder="123 Rue de la Paix"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_line2">Adresse ligne 2 (optionnel)</Label>
                <Input
                  id="address_line2"
                  value={profile.address_line2 || ''}
                  onChange={(e) => updateProfile('address_line2', e.target.value)}
                  placeholder="Appartement, étage, etc."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postal_code">Code postal</Label>
                  <Input
                    id="postal_code"
                    value={profile.postal_code || ''}
                    onChange={(e) => updateProfile('postal_code', e.target.value)}
                    placeholder="75001"
                  />
                </div>
                
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="city">Ville</Label>
                  <Input
                    id="city"
                    value={profile.city || ''}
                    onChange={(e) => updateProfile('city', e.target.value)}
                    placeholder="Paris"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Pays</Label>
                <Input
                  id="country"
                  value={profile.country || 'France'}
                  onChange={(e) => updateProfile('country', e.target.value)}
                  placeholder="France"
                />
              </div>
            </div>

            <Button type="submit" disabled={saving} className="w-full">
              {saving ? 'Sauvegarde en cours...' : 'Sauvegarder les modifications'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}