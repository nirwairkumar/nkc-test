import { useEffect, useState } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { forgetCandidateIfLeft, isCandidateVisit, isGuardedPath, isLeaving, leaveToJoin } from '@/lib/candidateExit';

/**
 * Back on the exam, submitted or result page of a candidate who came through a
 * test link or join code: ask first, then leave to /join (lib/candidateExit.ts).
 */
export default function CandidateBackGuard() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    setAsking(false);
    if (isLeaving() || !isCandidateVisit()) return;
    forgetCandidateIfLeft(pathname);
    if (!isCandidateVisit()) return;

    // A link or button on the page went to /join: drop the pages behind it too.
    // (Not on load or Back: those are 'POP', and the tab is already where it should be.)
    if (pathname === '/join' && navigationType !== 'POP') {
      leaveToJoin();
      return;
    }
    if (!isGuardedPath(pathname)) return;

    // A copy of this page sits on top, so Back lands here instead of leaving.
    window.history.pushState(window.history.state, '', window.location.href);
    const onBack = (e: PopStateEvent) => {
      if (isLeaving() || window.location.pathname !== pathname) return;
      // Same page: keep it from the router, which would re-render the page with a
      // fresh location.state (TestPage clears its saved session when that changes).
      e.stopImmediatePropagation();
      window.history.pushState(window.history.state, '', window.location.href);
      setAsking(true);
    };
    window.addEventListener('popstate', onBack, true);
    return () => window.removeEventListener('popstate', onBack, true);
  }, [pathname]);

  const inExam = /^\/live\/|^\/join\/[^/]+\/exam/.test(pathname);

  return (
    <AlertDialog open={asking} onOpenChange={setAsking}>
      <AlertDialogContent className="max-w-[min(400px,calc(100vw-32px))] rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{inExam ? 'Leave the exam?' : 'Leave this page?'}</AlertDialogTitle>
          <AlertDialogDescription className="text-[15px] leading-relaxed">
            {inExam
              ? "You haven't submitted your exam yet."
              : "You'll go back to the page where you enter a join code."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11 rounded-xl">Stay</AlertDialogCancel>
          <AlertDialogAction onClick={leaveToJoin} className="h-11 rounded-xl bg-rose-600 hover:bg-rose-700">
            Leave
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
