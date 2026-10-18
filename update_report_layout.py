import docx
from docx.shared import Inches, Pt, RGBColor
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls, qn
import subprocess
import pypdf

COLOR_BLACK = RGBColor(0, 0, 0)
COLOR_MAROON = '800000'

def apply_headers_and_footers(docx_path='FINAL_FYDP_PROJECT_REPORT.docx', output_docx='FINAL_FYDP_PROJECT_REPORT.docx', output_pdf='FINAL_FYDP_PROJECT_REPORT.pdf'):
    doc = docx.Document(docx_path)

    # 1. Clean up duplicate synthesis paragraphs at end of Chapter 6 if present
    for i in range(len(doc.paragraphs) - 1, 0, -1):
        if "In synthesis, the future work roadmap" in doc.paragraphs[i].text:
            if "In synthesis, the future work roadmap" in doc.paragraphs[i - 1].text:
                p = doc.paragraphs[i]
                p._p.getparent().remove(p._p)

    # 2. Adjust data dictionary tables 11, 12, 13 (Chapter 4) so all 3 fit on page 19
    for t_idx in [11, 12, 13]:
        t = doc.tables[t_idx]
        tblPr = t._tbl.tblPr
        existing_mar = tblPr.find(qn('w:tblCellMar'))
        if existing_mar is not None:
            tblPr.remove(existing_mar)
        tblCellMar = parse_xml(r'''
            <w:tblCellMar %s>
                <w:top w:w="10" w:type="dxa"/>
                <w:bottom w:w="10" w:type="dxa"/>
                <w:left w:w="45" w:type="dxa"/>
                <w:right w:w="45" w:type="dxa"/>
            </w:tblCellMar>
        ''' % nsdecls('w'))
        tblPr.append(tblCellMar)
        
        for r_idx, row in enumerate(t.rows):
            sz = Pt(9.5) if r_idx == 0 else Pt(9.0)
            for cell in row.cells:
                tcPr = cell._tc.get_or_add_tcPr()
                existing_tcMar = tcPr.find(qn('w:tcMar'))
                if existing_tcMar is not None:
                    tcPr.remove(existing_tcMar)
                for cp in cell.paragraphs:
                    cp.paragraph_format.space_before = Pt(0)
                    cp.paragraph_format.space_after = Pt(0)
                    cp.paragraph_format.line_spacing = 1.0
                    for cr in cp.runs:
                        cr.font.size = sz

    # 3. Compact caption spacing for Table 4.6, 4.7, 4.8
    for p in doc.paragraphs:
        t = p.text.strip()
        if any(t.startswith(k) for k in ['Table 4.6:', 'Table 4.7:', 'Table 4.8:']):
            p.paragraph_format.space_before = Pt(2.0)
            p.paragraph_format.space_after = Pt(1.0)

    # 4. Insert section breaks before chapters (if not already split)
    if len(doc.sections) < 11:
        ch_targets = [
            '2. Literature Review',
            '3. Methodology',
            '4. System Design',
            '5. Results and Discussion',
            '6. Conclusion',
            'References',
            'Appendices',
            'Glossary'
        ]

        for ch_title in ch_targets:
            curr_p = None
            curr_idx = -1
            for i, p in enumerate(doc.paragraphs):
                if p.text.strip() == ch_title:
                    curr_p = p
                    curr_idx = i
                    break
                    
            for r in list(curr_p.runs):
                brs = r._r.xpath('.//w:br[@w:type="page"]')
                for b in brs:
                    b.getparent().remove(b)
                    
            if ch_title == '5. Results and Discussion':
                t13 = doc.tables[13]._tbl
                p_sec = parse_xml(r'''
                    <w:p %s>
                        <w:pPr>
                            <w:spacing w:before="0" w:after="0"/>
                            <w:sectPr>
                                <w:type w:val="nextPage"/>
                                <w:pgSz w:w="12240" w:h="15840"/>
                                <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
                            </w:sectPr>
                        </w:pPr>
                    </w:p>
                ''' % nsdecls('w'))
                t13.addnext(p_sec)
            else:
                prev_p = doc.paragraphs[curr_idx - 1]
                for r in list(prev_p.runs):
                    brs = r._r.xpath('.//w:br[@w:type="page"]')
                    for b in brs:
                        b.getparent().remove(b)
                pPr = prev_p._p.get_or_add_pPr()
                sectPr = parse_xml(r'''
                    <w:sectPr %s>
                        <w:type w:val="nextPage"/>
                        <w:pgSz w:w="12240" w:h="15840"/>
                        <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
                    </w:sectPr>
                ''' % nsdecls('w'))
                pPr.append(sectPr)

    # 5. Helper functions for header and footer styling
    def setup_header(p, left_text, right_text):
        p.text = ''
        pPr = p._p.get_or_add_pPr()
        tabs = parse_xml(r'''
            <w:tabs %s>
                <w:tab w:val="clear" w:pos="4680"/>
                <w:tab w:val="clear" w:pos="4320"/>
                <w:tab w:val="right" w:pos="9360"/>
            </w:tabs>
        ''' % nsdecls('w'))
        pPr.append(tabs)
        # Double rule: thin on top, small gap, thick on bottom (maroon #800000)
        pBdr = parse_xml(r'''
            <w:pBdr %s>
                <w:bottom w:val="thinThickMediumGap" w:sz="18" w:space="4" w:color="800000"/>
            </w:pBdr>
        ''' % nsdecls('w'))
        pPr.append(pBdr)
        r1 = p.add_run(left_text)
        r1.font.name = 'Times New Roman'
        r1.font.size = Pt(10)
        r1.font.color.rgb = COLOR_BLACK
        r_tab = p.add_run('\t')
        r_tab.font.name = 'Times New Roman'
        r_tab.font.size = Pt(10)
        r2 = p.add_run(right_text)
        r2.font.name = 'Times New Roman'
        r2.font.size = Pt(10)
        r2.font.color.rgb = COLOR_BLACK

    def setup_footer(p, left_text='Online Medical Consultation Platform'):
        p.text = ''
        pPr = p._p.get_or_add_pPr()
        tabs = parse_xml(r'''
            <w:tabs %s>
                <w:tab w:val="clear" w:pos="4680"/>
                <w:tab w:val="clear" w:pos="4320"/>
                <w:tab w:val="right" w:pos="9360"/>
            </w:tabs>
        ''' % nsdecls('w'))
        pPr.append(tabs)
        # Single solid rule on top of footer (maroon #800000)
        pBdr = parse_xml(r'''
            <w:pBdr %s>
                <w:top w:val="single" w:sz="12" w:space="4" w:color="800000"/>
            </w:pBdr>
        ''' % nsdecls('w'))
        pPr.append(pBdr)
        r1 = p.add_run(left_text)
        r1.font.name = 'Times New Roman'
        r1.font.size = Pt(10)
        r1.font.color.rgb = COLOR_BLACK
        r_tab = p.add_run('\t')
        r_tab.font.name = 'Times New Roman'
        r_tab.font.size = Pt(10)
        fld = parse_xml(r'<w:fldSimple %s w:instr="PAGE"/>' % nsdecls('w'))
        p._p.append(fld)

    # 6. Section 0: Title page (no header/footer)
    s0 = doc.sections[0]
    s0.different_first_page_header_footer = True
    for hp in s0.header.paragraphs: hp.text = ''
    for fp in s0.footer.paragraphs: fp.text = ''
    for hp in s0.first_page_header.paragraphs: hp.text = ''
    for fp in s0.first_page_footer.paragraphs: fp.text = ''

    # 7. Section 1: Front Matter (lower roman numerals, centered)
    s1 = doc.sections[1]
    s1.different_first_page_header_footer = False
    s1.header.is_linked_to_previous = False
    for hp in s1.header.paragraphs: hp.text = ''
    s1.footer.is_linked_to_previous = False
    fp = s1.footer.paragraphs[0]
    fp.text = ''
    fp.alignment = docx.enum.text.WD_ALIGN_PARAGRAPH.CENTER
    r = fp.add_run()
    r.font.name = 'Times New Roman'
    r.font.size = Pt(10)
    r.font.color.rgb = COLOR_BLACK
    fp._p.append(parse_xml(r'<w:fldSimple %s w:instr="PAGE"/>' % nsdecls('w')))
    s1_sectPr = s1._sectPr
    existing_pgNum = s1_sectPr.find(qn('w:pgNumType'))
    if existing_pgNum is not None: s1_sectPr.remove(existing_pgNum)
    s1_sectPr.append(parse_xml(r'<w:pgNumType %s w:fmt="lowerRoman" w:start="1"/>' % nsdecls('w')))

    # 8. Main Body Sections 2 to 10
    section_headers = [
        ('Chapter no 1', 'Introduction'),
        ('Chapter no 2', 'Literature Review'),
        ('Chapter no 3', 'Methodology'),
        ('Chapter no 4', 'System Design'),
        ('Chapter no 5', 'Results and Discussion'),
        ('Chapter no 6', 'Conclusion'),
        ('References', 'Online Medical Consultation Platform'),
        ('Appendices', 'Online Medical Consultation Platform'),
        ('Glossary', 'Online Medical Consultation Platform'),
    ]

    for i, (h_left, h_right) in enumerate(section_headers):
        s_idx = 2 + i
        s = doc.sections[s_idx]
        s.different_first_page_header_footer = False
        s.header.is_linked_to_previous = False
        setup_header(s.header.paragraphs[0], h_left, h_right)
        
        if i == 0:
            s.footer.is_linked_to_previous = False
            setup_footer(s.footer.paragraphs[0])
            s_sectPr = s._sectPr
            existing_pgNum = s_sectPr.find(qn('w:pgNumType'))
            if existing_pgNum is not None: s_sectPr.remove(existing_pgNum)
            s_sectPr.append(parse_xml(r'<w:pgNumType %s w:fmt="decimal" w:start="1"/>' % nsdecls('w')))
        else:
            s.footer.is_linked_to_previous = True
            s_sectPr = s._sectPr
            existing_pgNum = s_sectPr.find(qn('w:pgNumType'))
            if existing_pgNum is not None: s_sectPr.remove(existing_pgNum)
            s_sectPr.append(parse_xml(r'<w:pgNumType %s w:fmt="decimal"/>' % nsdecls('w')))

    doc.save(output_docx)
    print(f"Saved {output_docx} successfully.")

    subprocess.run(['libreoffice', '--headless', '--convert-to', 'pdf', output_docx, '--outdir', '.'], check=True)
    print(f"Exported {output_pdf} successfully.")

if __name__ == '__main__':
    apply_headers_and_footers()
