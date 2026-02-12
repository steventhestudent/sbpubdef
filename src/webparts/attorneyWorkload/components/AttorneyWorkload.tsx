import * as React from 'react';
import type { IAttorneyWorkloadProps } from './IAttorneyWorkloadProps';

export default function AttorneyWorkload(props: IAttorneyWorkloadProps): JSX.Element {
  const { counties } = props;
  const [searchText, setSearchText] = React.useState('');
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedItems(newExpanded);
  };

  const filteredCounties = counties.filter(county =>
    county.name.toLowerCase().includes(searchText.toLowerCase()) ||
    county.caseTypes.some(ct =>
      ct.type.toLowerCase().includes(searchText.toLowerCase()) ||
      ct.attorneys.some(att =>
        att.name.toLowerCase().includes(searchText.toLowerCase()) ||
        att.cases.some(c => c.number.toLowerCase().includes(searchText.toLowerCase()))
      )
    )
  );

  return (
    <section style={{ maxWidth: '500px', border: '1px solid #ccc', borderRadius: '4px' }}>
      {/* Title */}
      <div style={{ padding: '8px', borderBottom: '1px solid #eee', backgroundColor: '#f9f9f9' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Attorney Workload</h2>
      </div>

      {/* Search */}
      <div style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
        <input
          type="text"
          placeholder="Search by county, attorney, or case..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
        />
      </div>

      {/* Counties */}
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {filteredCounties.length ? filteredCounties.map(county => {
          const countyId = `county-${county.name}`;
          const isCountyOpen = expandedItems.has(countyId);

          return (
            <div key={county.name} style={{ borderBottom: '1px solid #eee' }}>
              <button
                onClick={() => toggleExpand(countyId)}
                style={{ width: '100%', textAlign: 'left', padding: '8px', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {isCountyOpen ? '▼' : '▶'} {county.name}
              </button>

              {isCountyOpen && county.caseTypes.map(ct => {
                const ctId = `${countyId}-type-${ct.type}`;
                const isCtOpen = expandedItems.has(ctId);

                return (
                  <div key={ct.type} style={{ marginLeft: '16px' }}>
                    <button
                      onClick={() => toggleExpand(ctId)}
                      style={{ width: '100%', textAlign: 'left', padding: '6px', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      {isCtOpen ? '▼' : '▶'} {ct.type}
                    </button>

                    {isCtOpen && ct.attorneys.map(att => {
                      const attId = `${ctId}-att-${att.name}`;
                      const isAttOpen = expandedItems.has(attId);

                      return (
                        <div key={att.name} style={{ marginLeft: '16px' }}>
                          <button
                            onClick={() => toggleExpand(attId)}
                            style={{ width: '100%', textAlign: 'left', padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            {isAttOpen ? '▼' : '▶'} {att.name}
                          </button>

                          {isAttOpen && (
                            <div style={{ marginLeft: '16px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {att.cases.map(c => (
                                <div
                                  key={c.number}
                                  style={{ 
                                    padding: '2px 6px',
                                    backgroundColor: '#e0e0e0',
                                    color: '#333',
                                    borderRadius: '4px',
                                    fontSize: '11px'
                                  }}
                                >
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
        }) : (
          <div style={{ padding: '12px'}}>No results found for "{searchText}"</div>
        )}
      </div>
    </section>
  );
}
