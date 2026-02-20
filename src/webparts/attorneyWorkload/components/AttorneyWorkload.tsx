import * as React from 'react';
import type { IAttorneyWorkloadProps, ICountyData, ICaseType, IAttorney } from './IAttorneyWorkloadProps';
import styles from './AttorneyWorkload.module.scss';

export default function AttorneyWorkload(props: IAttorneyWorkloadProps): JSX.Element {
  const { counties } = props;
  const [searchText, setSearchText] = React.useState('');
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set());

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    newExpanded.has(id) ? newExpanded.delete(id) : newExpanded.add(id);
    setExpandedItems(newExpanded);
  };

  // Determine which parents to auto-expand based on search
  const getExpandedParents = React.useMemo(() => {
    if (!searchText) return new Set<string>();
    const lowerSearch = searchText.toLowerCase();
    const expanded = new Set<string>();

    counties.forEach(county => {
      const countyId = `county-${county.name}`;

      // County level search
      if (county.name.toLowerCase().includes(lowerSearch)) {
        return; // County itself is search target, do not auto-expand
      }

      county.caseTypes.forEach(ct => {
        const ctId = `${countyId}-type-${ct.type}`;

        // Case type level search
        if (ct.type.toLowerCase().includes(lowerSearch)) {
          expanded.add(countyId);
          return;
        }

        ct.attorneys.forEach(att => {
          const attId = `${ctId}-att-${att.name}`;

          // Attorney name search
          if (att.name.toLowerCase().includes(lowerSearch)) {
            expanded.add(countyId);
            expanded.add(ctId);
            return;
          }

          // Case number search
          const matchingCases = att.cases.filter(c => c.number.toLowerCase().includes(lowerSearch));
          if (matchingCases.length > 0) {
            expanded.add(countyId);
            expanded.add(ctId);
            expanded.add(attId);
          }
        });
      });
    });

    return expanded;
  }, [counties, searchText]);

  // Filter counties for search (keep all levels visible so dropdowns are clickable)
  const filteredCounties = React.useMemo((): ICountyData[] => {
    if (!searchText) return counties;

    const lowerSearch = searchText.toLowerCase();

    return counties
      .map(county => {
        const countyMatches = county.name.toLowerCase().includes(lowerSearch);

        const caseTypes = county.caseTypes
          .map(ct => {
            const ctMatches = ct.type.toLowerCase().includes(lowerSearch);

            const attorneys = ct.attorneys
              .map(att => {
                const attMatches =
                  att.name.toLowerCase().includes(lowerSearch) ||
                  att.cases.some(c => c.number.toLowerCase().includes(lowerSearch));

                return attMatches || ctMatches || countyMatches ? { ...att } : null;
              })
              .filter((att): att is IAttorney => att !== null);

            return ctMatches || attorneys.length > 0 || countyMatches ? { ...ct, attorneys } : null;
          })
          .filter((ct): ct is ICaseType => ct !== null);

        return countyMatches || caseTypes.length > 0 ? { ...county, caseTypes } : null;
      })
      .filter((county): county is ICountyData => county !== null);
  }, [counties, searchText]);

  // Determine if a dropdown is open
  const isDropdownOpen = (id: string) => expandedItems.has(id) || getExpandedParents.has(id);

  // Determine which cases to display for an attorney
  const getVisibleCases = (att: IAttorney) => {
    const lowerSearch = searchText.toLowerCase();
    if (!searchText) return att.cases; // show all normally
    // If any case number matches search, show only matching case numbers
    const matchingCases = att.cases.filter(c => c.number.toLowerCase().includes(lowerSearch));
    if (matchingCases.length > 0) return matchingCases;
    // Otherwise (search by name, case type, county) show all cases
    return att.cases;
  };

  return (
    <section className={styles.attorneyWorkload}>
      <h2 className={styles.title}>Attorney Workload</h2>

      <input
        className={styles.searchInput}
        type="text"
        placeholder="Search by county, case type, attorney, or case number..."
        value={searchText}
        onChange={handleSearchChange}
      />

      <div className={styles.countiesContainer}>
        {filteredCounties.length ? (
          filteredCounties.map(county => {
            const countyId = `county-${county.name}`;
            const isCountyOpen = isDropdownOpen(countyId);

            return (
              <div key={countyId} className={styles.countyCard}>
                <button className={styles.expandButton} onClick={() => toggleExpand(countyId)}>
                  {isCountyOpen ? '▼' : '▶'} {county.name}
                </button>

                {isCountyOpen &&
                  county.caseTypes.map(ct => {
                    const ctId = `${countyId}-type-${ct.type}`;
                    const isCtOpen = isDropdownOpen(ctId);

                    return (
                      <div key={ctId} className={styles.caseTypeCard}>
                        <button className={styles.expandButton} onClick={() => toggleExpand(ctId)}>
                          {isCtOpen ? '▼' : '▶'} {ct.type}
                        </button>

                        {isCtOpen &&
                          ct.attorneys.map(att => {
                            const attId = `${ctId}-att-${att.name}`;
                            const isAttOpen = isDropdownOpen(attId);

                            return (
                              <div key={attId} className={styles.attorneyCard}>
                                <button className={styles.expandButton} onClick={() => toggleExpand(attId)}>
                                  {isAttOpen ? '▼' : '▶'} {att.name}
                                </button>

                                {isAttOpen && (
                                  <div className={styles.casesContainer}>
                                    {getVisibleCases(att).map(c => (
                                      <div key={c.number} className={styles.caseNumber}>
                                        {c.number}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    );
                  })}
              </div>
            );
          })
        ) : (
          <div className={styles.noResults}>No results found for "{searchText}"</div>
        )}
      </div>
    </section>
  );
}