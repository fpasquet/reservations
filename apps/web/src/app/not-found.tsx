import Link from 'next/link';
import { buttonClasses } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-sm font-medium text-primary">Erreur 404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Cette page n’existe pas</h1>
      <p className="mt-2 text-ink-muted">Le lien est peut-être ancien, ou l’adresse mal saisie.</p>
      <Link href="/" className={`${buttonClasses()} mt-6`}>
        Retour au planning
      </Link>
    </div>
  );
}
