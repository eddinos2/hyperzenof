import React, { useState } from 'react';
import { BrutalCard, BrutalCardContent, BrutalCardHeader, BrutalCardTitle } from '@/components/ui/brutal-card';
import { BrutalButton } from '@/components/ui/brutal-button';
import { BrutalInput } from '@/components/ui/brutal-input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';
import { Upload, Users, CheckCircle, AlertCircle, FileText } from 'lucide-react';

const TEACHER_DATA = `Jamal	ABAID	abaid.jamal@gmail.com	 06 15 16 69 47	DOUAI
Lahcene	ABDELHAFID	abdelhafid@neuf.fr	06 29 18 28 78	PARMENTIER
Laura	ABDELLI	abdelli.laura@gmail.com	07 83 02 33 69	PARMENTIER, BOULOGNE
Angeline	ADELAIDE-EDOUARD	contact.amyeline@gmail.com	 06 45 56 66 94	PICPUS
Justin	ALBERT	justin.albert1205@gmail.com		JAURES
Virginie	ALBERT	virginie.albert60@yahoo.fr		NICE
Mickael	AMAR	mickaelamar75@gmail.com	06 25 70 86 98	PICPUS
Boualem	AMIROUCHE	bamirouche2003@yahoo.fr	07 51 43 79 11	PICPUS
Chloé	ANKRI	chloe@aurlom.com	0658063193	ROQUETTE
Yohan	ARFI	yohan.arfi@segula.fr	06 03 40 86 77	PICPUS
Louis-Aden	AYANOU	ayanoulouisaden@yahoo.fr	06 99 22 24 52	SENTIER
Aboubacry	BA	baboubakry@yahoo.fr	06 29 87 22 74	JAURES
Nastasia	BALANDIER	nastasiabalandier@gmail.com	0650583352	SAINT SEB
Joseph	BANICKI	jj.banicki@gmail.com	07 49 17 18 20	NICE
Mohamed Sidi	BATNI	smbatni@gmail.com	06 10 47 82 75	PICPUS
Jamil	BEN ACHOUR	jamil.benachour@icam.fr	07 62 50 77 49	PICPUS
Inès	BENAMARA	ines.ben.mail@gmail.com	06 59 87 41 75	JAURES
Adel	BENRAHAL	adelbenrahal1@gmail.com	06 50 80 79 10	PARMENTIER, BOULOGNE
Meryeme	BENRAMDANE	meryembenramdane94@gmail.com	06 41 27 17 47	PICPUS
Soumaya	BENYAHIA	soumaya7@hotmail.fr	06 45 29 99 59	PARMENTIER
Aminata	BEYE	aminatabeye06@yahoo.fr	06 82 71 45 22	ROQUETTE
Murielle	BILLAUD	mganierbillaud@gmail.com	06 13 66 20 10	
Gisèle	BOCCARA	gisele.boccara@gmail.com	07 52 62 28 69	JAURES
Théodora	BORD	t.bord.formation@gmail.com	06 44 23 81 94	NICE
Valérie	BOUARD	valeriebouard32@gmail.com	06 71 22 03 28	PARMENTIER
Sainteli	BOUENDA	sbouenda@gmail.com	07 54 50 71 87	PARMENTIER
Djamilla	BOUHADJAR	djamilabouhadjar@orange.fr	06 09 67 23 87	
Hocine	BOUHALLA	bouhallahocine@yahoo.fr	07 62 81 19 88	
Lionel	BRAKHA	lionel.brakha@pretcarre.fr	 06 25 94 09 79	
Michael	BRICE	michael.brice.mb@gmail.com	06 93 53 68 64	NICE
Frédéric	BRUNO	mail.fred.bruno@gmail.com	06 51 28 44 18	SENTIER
Hervé	CALVO	calvo_herve@yahoo.fr	06 64 64 60 22	
Nathalie	CAMPANELLA	nathaliecoquelet03@gmail.com	06 80 66 66 07	JAURES
Antoine	CASANOVA	casanovaantoine00@gmail.com	06 21 36 78 84	SENTIER
Carmen	CASTANO	caincama@gmail.com	00 57 310 516 1033	NICE
Gaëtane	CATALANO	gaetane@terresderelation.fr	0615774729	ROQUETTE
Carole	CHABANIER	caro.chabanier@wanadoo.fr	06 60 17 47 68	NICE
Dan	COHEN	dan20co@gmail.com	642272161	ROQUETTE
Christophe	COIRET	coiret.christophe@orange.fr	06 33 15 57 55	DOUAI
Cléa	CORTINAS	cleacortinascazeres@gmail.com	06 77 77 45 43	NICE
Nadège	COURTIN	ncourtin@hotmail.fr	06 38 71 21 59	PARMENTIER, BOULOGNE
Louise 	COUTURIER	couturier.louise@gmail.com	06 76 93 36 33	SENTIER
Flore	D'ARFEUILLE	darfeuille.flore@gmail.com	06 16 72 79 79	ROQUETTE, SENTIER
Esther	DADIE	estherdadie835@gmail.com	07 67 22 83 53	DOUAI
Umit	DAG	dag77umit@gmail.com	06 01 00 30 52	DOUAI
Radj	DAMIEN	sonali.formation@gmail.com	06 20 70 90 67	DOUAI
Natasha	DAMIEN	natacha.damien@yahoo.com		DOUAI
Richard	DARMON	r_darmon@yahoo.com	06 60 1304 97	JAURES
Jimmy	DARMON	jimmydarmon.pro@gmail.com 	06 63 91 22 51	PICPUS
Anne	DELAIGUE	adformation.conseil.audit@gmail.com 	0631643660	ROQUETTE
Angéline	DELVART	angeline.delvart@in-motion.paris	06 19 94 21 48	DOUAI
Michel	DESSEAUX	michel.desseaux@wanadoo.fr	06 64 22 85 60	ROQUETTE
Emmanuel	DESWARTES	emmanuel@finavril.com	06 60 40 75 21	JAURES
Lucie	DI BIASI	lucie.dibiasi@comunpont.com	0630608201	ROQUETTE
Djibril	DIAKHATE	djibrildiakhate@hotmail.com 	07 67 73 47 48	JAURES
Daouda	DIARRA	daoumail@yahoo.fr	06 51 27 47 23	PARMENTIER
Nora	DJADJIK	nora.djedjik@gmail.com	06.25.03.87.24	DOUAI
Abdoulaye	DRAME	abdoulayedrame917@gmail.com	07 83 23 58 53	PARMENTIER
Olivier 	DUVAL	olivier.duval83@gmail.com	06 78 76 13 19	PARMENTIER
Jean-Jacques	DZIALOWSKI	jeandzia250@hotmail.com 	07 68 60 64 20	PARMENTIER, ROQUETTE
Lina	EL CHEIKH	ellinlina@hotmail.com	06 22 66 00 14	PICPUS
Joakim	ELBAZ	elbaz.joakim@gmail.com	06 66 02 38 89	PICPUS
Stéphane	ENCEL	stephaneencel@yahoo.fr 	06 22 36 40 02 	PARMENTIER, PICPUS
Stéphane	ENCEL	stephaneencel@yahoo.fr 	06 22 36 40 02 	ROQUETTE
Laurent 	ESCRIVA	laurent.escriva@orange.fr	06 25 74 28 04	SENTIER
Brigitte	EVENO	brigitte@editionsbrigitteeveno.com	06 21 56 25 77	ROQUETTE
Fabien 	EZELIN	fabien.ezelin@outlook.com	07 82 82 81 20	SENTIER
Alexandre	FINE	alexandre@lebureaudefabrication.com	06 73 05 28 36	ROQUETTE
Kherdine 	FRAINE	kherdinefraine@gmail.com	06 31 00 71 44	PICPUS
Yosr	GALLEB	y.ghalleb@novatiel.com	06 61 68 12 46	JAURES
Morteza 	GANDEHARI	btspi2030@gmail.com		
Adrien	GAUTIER	adrien@leparfumcitoyen.fr	06 21 57 06 45	NICE
Chahrazed	GERZOULI	chahra.gherzouli@gmail.com		NICE
Antoine	GIANELLI	agiannelli06@gmail.com	06 28 41 00 50	NICE
Jason	GUILBERT	jasonguilbert2014@hotmail.fr	06 01 67 08 04	DOUAI, ROQUETTE
Rebecca	GUIRCHOUME	reb.guirchoume@gmail.com	07 49 47 44 56	NICE
Alice 	GWADE	alice.gwade@gmail.com	06 59 54 12 91	PARMENTIER
Aziz	GZAGHAR	a.gzaghar@efmt-formations.com	0 627586030	
Stéphane	HALIMI	shalimi.pro@gmail.com	06 62 77 98 25	
Milan	HAMIDECHE	hamidechemilan@gmail.com	06 02 06 18 21	
Vanessa	HANANY (Sanchez)	sanchez.hanany@gmail.com		PARMENTIER
Sofia	HASNI	sofia.hasni@aurlom.com	07 82 92 82 68	ROQUETTE
djihane	hOUFANI	houfani.djihane26@gmail.com	06 24 79 36 64	
Bilal	IDRES	idresbilal1979@gmail.com	06 59 96 61 88	JAURES
Salim	IKABLINE	salimikabline@gmail.com	06 95 95 07 89	PARMENTIER
Julie	IRIGOYEN	julie.irigoyen@gmail.com	06 99 25 57 72	SENTIER
Anthony	ISRAEL	anthony.formation06@gmail.com	06 21 04 21 09	NICE
Kévin	JALADY	Jalady.formation@gmail.com	06 64 16 60 51	NICE
Hamza	JARRAF	hamza.jarraf@outlook..com	07 67 73 93 11	PICPUS
Simon	JOLY	simonjoly.osteo@gmail.com	06 45 94 59 64	PARMENTIER
Alice	KACI	kacialice@yahoo.fr	06 25 22 03 26	ROQUETTE
Somaya	KACIMI	contact.cofondation@gmail.com	613050652	ROQUETTE
Eudes 	KARABETIAN	eudeskarabetian@gmail.com	06 13 58 91 06	JAURES
Soufien	KHEDAIJI	soufienkhedaji@gmail.com	06 22 90 77 83	NICE
Fethi	KHERROUS	f.kherrous@hotmail.fr	06 22 94 18 21	
Mickael	KISSOUS	kissous.michael@gmail.com	06 16 98 23 32	PARMENTIER
Fabrice	KOUADJO	fabricekouadjo@tickey.net	07 77 26 66 66	PARMENTIER
Boubekeur	LALMI	lalmi.boubekeur@gmail.com	06 66 73 71 71	SENTIER
Régine	LARCHER	regine.larcherconcept@gmail.com	06 12 53 10 76	SENTIER
Mickael	LAURENT	laboratoire.mickael@gmail.com	771892024	PICPUS
François	LE PETIT LAZARE 	f.lepetitlazare@efmt-formations.com	0637871726	
Florence	LEMAUX	florencelemaux@gmail.com 	06 03 24 11 04	ROQUETTE
Déborah	LEVY	deborah@levy-avocat.com	06 25 28 62 42	NICE
Delphine	LORENZELLI	lebrindessavoirs@gmail.com	06 25 92 10 70	NICE
Riadh	MADIOUNI	r.madiouni@novatiel.com	07 44 93 96 04	JAURES
Elise	MAILLARD	el.maillard@gmail.com	06 64 83 07 38	ROQUETTE
Enock	MAIYO	enockmaiyo@yahoo.com	06 05 55 47 26	PARMENTIER
Alexandre	MALDERA	alexandre.maldera@gmail.com	06 03 84 15 09	
Fabrice	MANGA	f.manga0@proton.me	06 60 46 35 36	SENTIER
Arnaud 	MARCHAND	amarchand2@gmail.com	06 64 92 11 04	JAURES
Myriam	MARCIANO	myriam.marciano@aurlom.com	667031051	ROQUETTE
 Tony	MARTINEAU	clochardtony@gmail.com		
Alexandre	MASSON	masson.alex@yahoo.fr	06 27 64 29 47	JAURES
Cyril	MAYANCE	cyrilmayance@gmail.com	06 35 17 71 59	NICE
Samy	MECHAT	samlcht4444@gmail.com	06 51 93 64 85	PARMENTIER
Amal	MEJRI	amal_mejri@outlook.com	07 65 81 88 27	ROQUETTE, SAINT SEB, BOULOGNE
Hamadene	MÉKIRI	h.mekiri@yahoo.fr	06 64 81 69 86	PARMENTIER, BOULOGNE
Amina	MENIRI	amina@aurlom.com		
Joseph	MERCIER	joseph.mercier02@gmail.com	06 86 17 64 03	SENTIER
Nikelle	MESSI BAUMANN	messinikelle@hotmail.com	06 67 95 96 45	
Tiphaine	MICHEL	tiphaine.michel06@gmail.com	07 78 82 16 29	NICE
Laurence	MIGIANI	laurence.migiani@gmail.com	06 74 66 74 83	NICE
Matthieu	MISIRACA	matthieu@misiraca.com	06 13 40 15 85	SENTIER
Vanessa	MONGODIN	gnocchivanessa@gmail.com	06 23 79 28 44	NICE
Fouzia	MOUHKLIL	fouziam@hotmail.fr	06 30 04 92 95	
Arthur	MURPHY	arthurmurphy@orange.fr	0 642712019	
Chaima	NABI 	cheima.nabi@gmail.com	06 23 06 97 20	
Ghina	NASSERDINE	ghina_nasserdine@hotmail.com	 06 25 97 17 32	DOUAI
Fatim	NDIAYE	fatimfa9@yahoo.com	06 62 39 42 03	PARMENTIER
Yolande	NDJEMBA	yokmer@yahoo.com	06 62 12 86 92	DOUAI
Ghislain	NDJEMBA	medou17@yahoo.com	06 61 96 25 80	PARMENTIER
Angèle	NDJEMBA	ndjembaangele@gmail.com	06 68 19 15 29	PARMENTIER
Enguerran	NDONG	unguerran@yahoo.fr	06 31 81 70 04	JAURES
Eva	NEGRE	eva.webassistante@gmail.com	06 58 42 83 00	
Fernando	NETTO	netto@fnetto.com		
Caroline	NEYROUD	carolineneyroud@gmail.com	06 63 73 53 94	NICE
Moustapha	NGOM	moustapha8@hotmail.fr	07 69 11 12 93	DOUAI
Omar	OUHBAD	o.ouhbad@novatiel.com	06 63 12 10 95	JAURES
Claire	PARIZEL	claireparizel@gmail.com	06 79 29 20 61	ROQUETTE, SENTIER
Virginie	PEROCHEAU	vperocheau@gmail.com	06 12 98 44 30	ROQUETTE
Olivia	PIAU	oliviapiau@gmail.com	06 11 98 21 68	
Bertrand	PIBOULE	bertrand.piboule@gmail.com	06 58 16 07 08	PICPUS
Aurore	POTTIER	pottier_aurore@yahoo.fr	06 18 90 53 15	PARMENTIER
Jean	RAYMOND	raymond.R.Jean@gmail.com	06 22 48 74 26	DOUAI
Paul	REMY	paulk.pro95@gmail.com	06 33 53 59 10	PARMENTIER
Nicolas	REVAH	nicorevah@gmail.com		NICE
Tarek	RHOUMA	tarek.rhouma@hotmail.fr	06 11 61 70 16	PICPUS
Maria	RODAS	mariarodas.rm@gmail.com 	07 81 31 82 69	ROQUETTE, JAURES
Paulo	RODRIGUES	paulo.rodrigues@kuvango.com	06 07 86 26 59	JAURES
Manoelle	SALICETI	manorcada@yahoo.fr	06.83.24.59.15	NICE
Leroy	SAMY	jcleroy007@gmail.com	06 66 00 39 22	NICE
Sarah	SLIMANE	slimane.sarah@gmail.com	06 51 79 43 05	NICE
Noémie	TAJSZEYDLER	hazelandglasz@gmail.com	06 63 47 83 71	PICPUS
Noémie	TAJSZYEDLER	hazelandglasz@gmail.com 	06 63 47 83 71	ROQUETTE
Laura	TENDIL	lauratendil@gmail.com	06 58  62 77 58	ROQUETTE, SENTIER, JAURES
Mathis	TERRAMORSI	M.Terramorsi@gmail.com 	06.34.55.54.20	ROQUETTE
Luna	THALMENSY			PARMENTIER
Claude 	TOLÉ	claude.tole@gmail.com	06 23 79 75 75 	SENTIER
Nouhoun	TRAORÉ	ntraore.pro@gmail.com	06 22 81 67 95	ROQUETTE
Ruben	TSHITALA SUL	sul75014@gmail.com	07 83 80 60 09	PICPUS
Eugenia	URREA	formation.urrea@gmail.com	06 08 61 52 17	PARMENTIER
Louis-Marie	VALIN	louismarie.valin@yahoo.fr	0625593110	ROQUETTE
Suda	VALMY	suda.valmy3s@gmail.com	06 99 24 46 21	
Aymeric	VERGNON	avergnon@gmail.com	06 13 24 40 44	PARMENTIER
Sébastien	VEYSSIER	seb.veyssier@gmail.com		JAURES
Emilie	VIVES	emilie.vives@yahoo.fr	07 79 49 87 05	NICE
Nachiketas	WIGNESAN	nachiketas2001@aol.com	06 63 74 11 66	SENTIER
Guillaume	Yan	y.guillaume@hotmail.fr		NICE`;

export function TeacherAutoAssignment() {
  const { profile } = useAuth();
  const [csvData, setCsvData] = useState(TEACHER_DATA);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<any>(null);

  const parseTeacherData = (data: string) => {
    const lines = data.trim().split('\n');
    const teachersRaw = [] as Array<{ first_name: string; last_name: string; email: string; phone: string | null; campus_names: string | null }>;
    
    const clean = (v?: string) => (v || '').replace(/^\s*"|"\s*$/g, '').replace(/\s+/g, ' ').trim();
    const cleanEmail = (v?: string) => clean(v).toLowerCase();
    const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

    for (const line of lines) {
      if (!line.trim()) continue;
      const parts = line.split('\t');
      if (parts.length >= 3) {
        const [firstName, lastName, email, phone, ...campusParts] = parts;
        const campusNames = clean(campusParts.join(' '));
        const emailClean = cleanEmail(email);
        if (!emailClean || !isValidEmail(emailClean)) continue; // skip invalid emails

        teachersRaw.push({
          first_name: clean(firstName),
          last_name: clean(lastName),
          email: emailClean,
          phone: clean(phone) || null,
          campus_names: campusNames || null
        });
      }
    }

    // Dedupe by email inside the parsed list
    const uniqueMap = new Map<string, (typeof teachersRaw)[number]>();
    for (const t of teachersRaw) {
      if (!uniqueMap.has(t.email)) uniqueMap.set(t.email, t);
    }
    return Array.from(uniqueMap.values());
  };

  const handleProcessAssignment = async () => {
    if (profile?.role !== 'SUPER_ADMIN') {
      toast.error('Accès réservé aux Super Administrateurs');
      return;
    }

    setProcessing(true);
    
    try {
      const teachers = parseTeacherData(csvData);
      
      if (teachers.length === 0) {
        toast.error('Aucune donnée valide trouvée');
        return;
      }

      toast.info(`Traitement de ${teachers.length} enseignants...`);

      // Vérifier quels emails existent déjà
      const { data: existingEmails, error: checkError } = await supabase
        .from('teacher_assignment_data')
        .select('email')
        .in('email', teachers.map(t => t.email));

      if (checkError) {
        console.error('Error checking existing emails:', checkError);
        toast.error('Erreur lors de la vérification des emails existants');
        return;
      }

      const existingEmailSet = new Set(existingEmails?.map(e => e.email) || []);
      const newTeachers = teachers.filter(teacher => !existingEmailSet.has(teacher.email));

      if (newTeachers.length === 0) {
        toast.warning('Tous les enseignants ont déjà été traités');
        return;
      }

      toast.info(`${newTeachers.length} nouveaux enseignants à traiter (${teachers.length - newTeachers.length} déjà existants)`);

      // Insérer seulement les nouveaux enseignants (upsert ignore les doublons par email)
      const { data: insertedData, error: insertError } = await supabase
        .from('teacher_assignment_data')
        .upsert(newTeachers, { onConflict: 'email', ignoreDuplicates: true })
        .select();

      if (insertError) {
        console.error('Error inserting teacher data:', insertError);
        toast.error('Erreur lors de l\'insertion des données');
        return;
      }

      // Récupérer les campus existants
      const { data: campusData, error: campusError } = await supabase
        .from('campus')
        .select('id, name');

      if (campusError) {
        console.error('Error fetching campus data:', campusError);
        toast.error('Erreur lors de la récupération des campus');
        return;
      }

      // Créer un mapping des noms de campus
      const campusMap = campusData?.reduce((acc, campus) => {
        const normalizedName = campus.name.toUpperCase()
          .replace(/[ÀÁÂÃÄÅàáâãäå]/g, 'A')
          .replace(/[ÈÉÊËèéêë]/g, 'E')  
          .replace(/[ÌÍÎÏìíîï]/g, 'I')
          .replace(/[ÒÓÔÕÖòóôõö]/g, 'O')
          .replace(/[ÙÚÛÜùúûü]/g, 'U')
          .replace(/[Çç]/g, 'C')
          .trim();
        
        acc[normalizedName] = campus.id;
        
        // Mappings spéciaux
        if (normalizedName.includes('SAINT')) {
          acc[normalizedName.replace('SAINT', 'ST')] = campus.id;
        }
        if (normalizedName === 'SAINT-SEBASTIEN') {
          acc['SAINT SEB'] = campus.id;
        }
        
        return acc;
      }, {} as Record<string, string>) || {};

      // Traiter chaque enseignant
      let processedCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const teacher of insertedData) {
        try {
          // Générer un mot de passe temporaire
          const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();
          
          // Déterminer le campus principal
          let primaryCampusId = null;
          if (teacher.campus_names) {
            const campusNames = teacher.campus_names.split(',').map((name: string) => name.trim().toUpperCase());
            
            for (const campusName of campusNames) {
              const normalizedName = campusName
                .replace(/[ÀÁÂÃÄÅàáâãäå]/g, 'A')
                .replace(/[ÈÉÊËèéêë]/g, 'E')
                .replace(/[ÌÍÎÏìíîï]/g, 'I')
                .replace(/[ÒÓÔÕÖòóôõö]/g, 'O')
                .replace(/[ÙÚÛÜùúûü]/g, 'U')
                .replace(/[Çç]/g, 'C')
                .trim();
              
              if (campusMap[normalizedName]) {
                primaryCampusId = campusMap[normalizedName];
                break;
              }
            }
          }

          // Créer l'utilisateur via edge function
          const { data: userData, error: userError } = await supabase.functions.invoke('create-user', {
            body: {
              email: teacher.email,
              password: tempPassword,
              firstName: teacher.first_name,
              lastName: teacher.last_name,
              role: 'ENSEIGNANT',
              campusId: primaryCampusId,
              phone: teacher.phone
            }
          });

          if (userError) {
            throw new Error(`Erreur création utilisateur: ${userError.message}`);
          }

          // Marquer comme traité
          await supabase
            .from('teacher_assignment_data')
            .update({
              is_processed: true,
              processed_at: new Date().toISOString(),
              assigned_user_id: userData.user?.id
            })
            .eq('id', teacher.id);

          processedCount++;
          
        } catch (error: any) {
          console.error(`Error processing teacher ${teacher.email}:`, error);
          errors.push(`${teacher.first_name} ${teacher.last_name} (${teacher.email}): ${error.message}`);
          errorCount++;
          
          // Marquer l'erreur
          await supabase
            .from('teacher_assignment_data')
            .update({
              is_processed: true,
              processed_at: new Date().toISOString(),
              error_message: error.message
            })
            .eq('id', teacher.id);
        }
      }

      setResults({
        total: teachers.length,
        newTeachers: newTeachers.length,
        processed: processedCount,
        errors: errorCount,
        errorDetails: errors,
        skipped: teachers.length - newTeachers.length
      });

      if (processedCount > 0) {
        toast.success(`${processedCount} enseignants traités avec succès !`);
      }
      
      if (errorCount > 0) {
        toast.warning(`${errorCount} erreurs rencontrées`);
      }

    } catch (error: any) {
      console.error('Processing error:', error);
      toast.error(`Erreur de traitement: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  if (profile?.role !== 'SUPER_ADMIN') {
    return (
      <BrutalCard>
        <BrutalCardContent className="text-center py-8">
          <p className="text-muted-foreground">Accès réservé aux Super Administrateurs</p>
        </BrutalCardContent>
      </BrutalCard>
    );
  }

  return (
    <BrutalCard>
      <BrutalCardHeader>
        <BrutalCardTitle className="flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Assignation Automatique des Enseignants
        </BrutalCardTitle>
      </BrutalCardHeader>
      <BrutalCardContent className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Données des Enseignants (Format: Prénom\tNom\tEmail\tTéléphone\tCampus)
          </label>
          <Textarea
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            rows={10}
            className="font-mono text-xs"
            placeholder="Prénom	Nom	Email	Téléphone	Campus"
          />
          <p className="text-xs text-muted-foreground mt-2">
            {parseTeacherData(csvData).length} enseignants détectés
          </p>
        </div>

        <div className="flex space-x-4">
          <BrutalButton
            onClick={handleProcessAssignment}
            disabled={processing}
            className="flex-1"
          >
            {processing ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-spin" />
                Traitement en cours...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Traiter l'assignation
              </>
            )}
          </BrutalButton>
          
          <BrutalButton
            variant="outline"
            onClick={() => setCsvData(TEACHER_DATA)}
          >
            <FileText className="h-4 w-4 mr-2" />
            Réinitialiser
          </BrutalButton>
        </div>

        {results && (
          <BrutalCard>
            <BrutalCardHeader>
              <BrutalCardTitle className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                Résultats du traitement
              </BrutalCardTitle>
            </BrutalCardHeader>
            <BrutalCardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{results.total}</div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{results.processed}</div>
                  <div className="text-sm text-muted-foreground">Traités</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{results.errors}</div>
                  <div className="text-sm text-muted-foreground">Erreurs</div>
                </div>
                {results.skipped > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{results.skipped}</div>
                    <div className="text-sm text-muted-foreground">Ignorés (déjà traités)</div>
                  </div>
                )}
              </div>
              
              {results.newTeachers !== undefined && (
                <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400">
                  <p className="text-sm text-blue-700">
                    <strong>{results.newTeachers}</strong> nouveaux enseignants détectés pour traitement
                  </p>
                </div>
              )}

              {results.errorDetails.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                    Détail des erreurs:
                  </h4>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {results.errorDetails.map((error: string, index: number) => (
                      <div key={index} className="text-xs text-red-600 p-2 bg-red-50 rounded">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </BrutalCardContent>
          </BrutalCard>
        )}
      </BrutalCardContent>
    </BrutalCard>
  );
}