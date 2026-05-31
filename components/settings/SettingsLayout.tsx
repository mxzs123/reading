import type { ReactNode } from "react";
import styles from "./settingsStyles.module.css";

interface ChildrenProps {
  children: ReactNode;
}

interface TitledChildrenProps extends ChildrenProps {
  title: ReactNode;
}

export function SettingsSection({ title, children }: TitledChildrenProps) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>{title}</div>
      {children}
    </section>
  );
}

export function FieldGrid({ children }: ChildrenProps) {
  return <div className={styles.grid2}>{children}</div>;
}

export function FieldRow({ children }: ChildrenProps) {
  return <div className={styles.fieldRow}>{children}</div>;
}

export function SettingsFieldLabel({ children }: ChildrenProps) {
  return <span className={styles.fieldLabel}>{children}</span>;
}

export function SettingsHint({ children }: ChildrenProps) {
  return <p className={styles.apiKeyHint}>{children}</p>;
}

export function SettingsDetails({ title, children }: TitledChildrenProps) {
  return (
    <details className={styles.details}>
      <summary className={styles.detailsSummary}>{title}</summary>
      <div className={styles.detailsBody}>{children}</div>
    </details>
  );
}
